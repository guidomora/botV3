import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  ConsumeWhatsappReservationQuotaParams,
  ConsumeWhatsappReservationQuotaResult,
  ReleaseWhatsappReservationQuotaParams,
  ReleaseWhatsappReservationQuotaResult,
  SubscriptionStatus,
  UsageEventType,
  UsageLimitCheckResult,
} from 'src/lib';
import {
  DataSource,
  DeleteResult,
  InsertResult,
  LessThanOrEqual,
  MoreThan,
  Repository,
  UpdateResult,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { MonthlyUsage, Subscription, UsageEvent } from '../entities';
import { BillingPeriodService } from './billing-period.service';

class PlanLimitReachedError extends Error {
  constructor() {
    super('plan_limit_reached');
  }
}

@Injectable()
export class UsageLimitService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly billingPeriodService: BillingPeriodService,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(MonthlyUsage)
    private readonly monthlyUsageRepository: Repository<MonthlyUsage>,
  ) {}

  async canCreateWhatsappReservation(accountId: string): Promise<UsageLimitCheckResult> {
    const now = new Date();
    const currentPeriod = this.billingPeriodService.getCurrentPeriod(now);
    const subscription = await this.findActiveSubscription(
      accountId,
      now,
      this.subscriptionRepository,
    );

    if (!subscription?.plan) {
      return {
        allowed: false,
        reason: 'missing_active_subscription',
      };
    }

    if (subscription.plan.isActive !== true) {
      return {
        allowed: false,
        reason: 'inactive_plan',
      };
    }

    const monthlyUsage = await this.monthlyUsageRepository.findOne({
      where: {
        accountId,
        period: currentPeriod,
      },
    });
    const usedReservations = monthlyUsage?.whatsappReservationsUsed ?? 0;

    if (usedReservations >= subscription.plan.monthlyWhatsappReservationLimit) {
      return {
        allowed: false,
        reason: 'limit_reached',
      };
    }

    return { allowed: true };
  }

  async consumeWhatsappReservationQuota(
    params: ConsumeWhatsappReservationQuotaParams,
  ): Promise<ConsumeWhatsappReservationQuotaResult> {
    const now = new Date();
    const period = this.billingPeriodService.getCurrentPeriod(now);

    try {
      return await this.dataSource.transaction(async (entityManager) => {
        const subscriptionRepository = entityManager.getRepository(Subscription);
        const subscription = await this.findActiveSubscription(
          params.accountId,
          now,
          subscriptionRepository,
        );

        if (!subscription?.plan) {
          return {
            allowed: false,
            reason: 'missing_active_subscription',
          };
        }

        if (subscription.plan.isActive !== true) {
          return {
            allowed: false,
            reason: 'inactive_plan',
          };
        }

        const usageEventValues: QueryDeepPartialEntity<UsageEvent> = {
          accountId: params.accountId,
          idempotencyKey: params.idempotencyKey,
          metadata: params.metadata as QueryDeepPartialEntity<UsageEvent['metadata']>,
          occurredAt: now,
          period,
          quantity: 1,
          eventType: UsageEventType.WHATSAPP_RESERVATION_CREATED,
        };

        const usageEventInsertResult = await entityManager
          .createQueryBuilder(UsageEvent, 'usageEvent')
          .insert()
          .into(UsageEvent)
          .values(usageEventValues)
          .orIgnore()
          .returning('id')
          .execute();

        if (!this.wasInsertApplied(usageEventInsertResult)) {
          return {
            allowed: true,
            alreadyConsumed: true,
          };
        }

        await entityManager
          .createQueryBuilder(MonthlyUsage, 'monthlyUsage')
          .insert()
          .into(MonthlyUsage)
          .values({
            accountId: params.accountId,
            period,
            whatsappReservationsUsed: 0,
          })
          .orIgnore()
          .execute();

        const incrementResult = await entityManager
          .createQueryBuilder(MonthlyUsage, 'monthlyUsage')
          .update(MonthlyUsage)
          .set({
            whatsappReservationsUsed: () => '"whatsappReservationsUsed" + 1',
            updatedAt: () => 'NOW()',
          })
          .where('"accountId" = :accountId', { accountId: params.accountId })
          .andWhere('"period" = :period', { period })
          .andWhere('"whatsappReservationsUsed" < :planLimit', {
            planLimit: subscription.plan.monthlyWhatsappReservationLimit,
          })
          .returning('id')
          .execute();

        if (!this.wasUpdateApplied(incrementResult)) {
          throw new PlanLimitReachedError();
        }

        return {
          allowed: true,
          alreadyConsumed: false,
        };
      });
    } catch (error) {
      if (error instanceof PlanLimitReachedError) {
        return {
          allowed: false,
          reason: 'limit_reached',
        };
      }

      throw error;
    }
  }

  async releaseWhatsappReservationQuota(
    params: ReleaseWhatsappReservationQuotaParams,
  ): Promise<ReleaseWhatsappReservationQuotaResult> {
    return this.dataSource.transaction(async (entityManager) => {
      const deleteResult = await entityManager
        .createQueryBuilder(UsageEvent, 'usageEvent')
        .delete()
        .from(UsageEvent)
        .where('"accountId" = :accountId', { accountId: params.accountId })
        .andWhere('"idempotencyKey" = :idempotencyKey', {
          idempotencyKey: params.idempotencyKey,
        })
        .andWhere('"eventType" = :eventType', {
          eventType: UsageEventType.WHATSAPP_RESERVATION_CREATED,
        })
        .returning('period')
        .execute();

      if (!this.wasDeleteApplied(deleteResult)) {
        return { released: false };
      }

      const deletedPeriod = this.extractDeletedPeriod(deleteResult);

      if (!deletedPeriod) {
        return { released: false };
      }

      await entityManager
        .createQueryBuilder(MonthlyUsage, 'monthlyUsage')
        .update(MonthlyUsage)
        .set({
          whatsappReservationsUsed: () => 'GREATEST("whatsappReservationsUsed" - 1, 0)',
          updatedAt: () => 'NOW()',
        })
        .where('"accountId" = :accountId', { accountId: params.accountId })
        .andWhere('"period" = :period', { period: deletedPeriod })
        .andWhere('"whatsappReservationsUsed" > 0')
        .execute();

      return { released: true };
    });
  }

  private findActiveSubscription(
    accountId: string,
    now: Date,
    repository: Pick<Repository<Subscription>, 'findOne'>,
  ): Promise<Subscription | null> {
    return repository.findOne({
      where: {
        accountId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: LessThanOrEqual(now),
        currentPeriodEnd: MoreThan(now),
      },
      relations: {
        plan: true,
      },
      order: {
        currentPeriodStart: 'DESC',
      },
    });
  }

  private wasInsertApplied(insertResult: InsertResult): boolean {
    if (Array.isArray(insertResult.raw)) {
      return insertResult.raw.length > 0;
    }

    if (this.hasRawRowCount(insertResult.raw)) {
      return insertResult.raw.rowCount > 0;
    }

    if (this.hasRawRows(insertResult.raw)) {
      return insertResult.raw.rows.length > 0;
    }

    return false;
  }

  private wasUpdateApplied(updateResult: UpdateResult): boolean {
    if (typeof updateResult.affected === 'number') {
      return updateResult.affected > 0;
    }

    if (Array.isArray(updateResult.raw)) {
      return updateResult.raw.length > 0;
    }

    if (this.hasRawRowCount(updateResult.raw)) {
      return updateResult.raw.rowCount > 0;
    }

    if (this.hasRawRows(updateResult.raw)) {
      return updateResult.raw.rows.length > 0;
    }

    return false;
  }

  private wasDeleteApplied(deleteResult: DeleteResult): boolean {
    if (typeof deleteResult.affected === 'number') {
      return deleteResult.affected > 0;
    }

    if (Array.isArray(deleteResult.raw)) {
      return deleteResult.raw.length > 0;
    }

    if (this.hasRawRowCount(deleteResult.raw)) {
      return deleteResult.raw.rowCount > 0;
    }

    if (this.hasRawRows(deleteResult.raw)) {
      return deleteResult.raw.rows.length > 0;
    }

    return false;
  }

  private extractDeletedPeriod(deleteResult: DeleteResult): string | null {
    const raw: unknown = deleteResult.raw;

    if (!Array.isArray(raw) || raw.length === 0) {
      return null;
    }

    const firstRow: unknown = raw[0];

    if (!this.hasStringPeriod(firstRow)) {
      return null;
    }

    return firstRow.period;
  }

  private hasRawRowCount(raw: unknown): raw is { rowCount: number } {
    if (typeof raw !== 'object' || raw === null) {
      return false;
    }

    return 'rowCount' in raw && typeof raw.rowCount === 'number';
  }

  private hasRawRows(raw: unknown): raw is { rows: unknown[] } {
    if (typeof raw !== 'object' || raw === null) {
      return false;
    }

    return 'rows' in raw && Array.isArray(raw.rows);
  }

  private hasStringPeriod(value: unknown): value is { period: string } {
    if (typeof value !== 'object' || value === null || !('period' in value)) {
      return false;
    }

    const candidate = value as Record<'period', unknown>;
    return typeof candidate.period === 'string';
  }
}
