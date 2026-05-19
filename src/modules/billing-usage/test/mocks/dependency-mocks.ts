import { BillingPeriodService } from '../../service/billing-period.service';
import { MonthlyUsage } from '../../entities/monthly-usage.entity';
import { Subscription } from '../../entities/subscription.entity';
import { UsageEvent } from '../../entities/usage-event.entity';
import {
  DataSource,
  DeleteResult,
  EntityManager,
  InsertResult,
  Repository,
  UpdateResult,
} from 'typeorm';

type MonthlyUsageRepositoryMock = jest.Mocked<
  Pick<Repository<MonthlyUsage>, 'create' | 'findOne' | 'save'>
>;
type SubscriptionRepositoryMock = jest.Mocked<Pick<Repository<Subscription>, 'findOne'>>;
type UsageEventRepositoryMock = jest.Mocked<
  Pick<Repository<UsageEvent>, 'create' | 'findOne' | 'save'>
>;

type CreateDataSourceMockParams = {
  subscriptionRepositoryMock?: SubscriptionRepositoryMock;
  usageEventQueryBuilderSequence?: Array<'insert' | 'delete'>;
  monthlyUsageQueryBuilderSequence?: Array<'initialize' | 'increment' | 'decrement'>;
  usageEventInsertResult?: InsertResult;
  monthlyUsageInitializeInsertResult?: InsertResult;
  monthlyUsageIncrementResult?: UpdateResult;
  usageEventDeleteResult?: DeleteResult;
  monthlyUsageDecrementResult?: UpdateResult;
};

type InsertQueryBuilderMock = {
  insert: jest.Mock;
  into: jest.Mock;
  values: jest.Mock;
  orIgnore: jest.Mock;
  returning: jest.Mock;
  onConflict: jest.Mock;
  execute: jest.Mock<Promise<InsertResult>, []>;
};

type UpdateQueryBuilderMock = {
  update: jest.Mock;
  set: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  returning: jest.Mock;
  execute: jest.Mock<Promise<UpdateResult>, []>;
};

type DeleteQueryBuilderMock = {
  delete: jest.Mock;
  from: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  returning: jest.Mock;
  execute: jest.Mock<Promise<DeleteResult>, []>;
};

type QueryBuilderEntity = typeof UsageEvent | typeof MonthlyUsage;

export type BillingUsageDataSourceMock = jest.Mocked<DataSource> & {
  usageEventInsertQueryBuilder: InsertQueryBuilderMock;
  monthlyUsageInitializeInsertQueryBuilder: InsertQueryBuilderMock;
  monthlyUsageIncrementQueryBuilder: UpdateQueryBuilderMock;
  usageEventDeleteQueryBuilder: DeleteQueryBuilderMock;
  monthlyUsageDecrementQueryBuilder: UpdateQueryBuilderMock;
};

export const createBillingPeriodServiceMock = () =>
  ({
    getCurrentPeriod: jest.fn<string, [Date | undefined]>(),
    getPeriodBounds: jest.fn(),
  }) as unknown as jest.Mocked<BillingPeriodService>;

export const createSubscriptionRepositoryMock = (): SubscriptionRepositoryMock =>
  ({
    findOne: jest.fn(),
  }) as SubscriptionRepositoryMock;

export const createUsageEventRepositoryMock = (): UsageEventRepositoryMock =>
  ({
    create: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  }) as UsageEventRepositoryMock;

export const createMonthlyUsageRepositoryMock = (): MonthlyUsageRepositoryMock =>
  ({
    create: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  }) as MonthlyUsageRepositoryMock;

export const createDataSourceMock = ({
  subscriptionRepositoryMock,
  usageEventQueryBuilderSequence = ['insert', 'delete'],
  monthlyUsageQueryBuilderSequence = ['initialize', 'increment', 'decrement'],
  usageEventInsertResult = {
    identifiers: [{ id: 'event-1' }],
    generatedMaps: [],
    raw: [{ id: 'event-1' }],
  },
  monthlyUsageInitializeInsertResult = {
    identifiers: [{ id: 'usage-1' }],
    generatedMaps: [],
    raw: [{ id: 'usage-1' }],
  },
  monthlyUsageIncrementResult = {
    generatedMaps: [],
    raw: [{ id: 'usage-1' }],
    affected: 1,
  },
  usageEventDeleteResult = {
    raw: [{ period: '2026-05' }],
    affected: 1,
  },
  monthlyUsageDecrementResult = {
    generatedMaps: [],
    raw: [{ id: 'usage-1' }],
    affected: 1,
  },
}: CreateDataSourceMockParams): BillingUsageDataSourceMock => {
  const usageEventInsertQueryBuilder = createInsertQueryBuilderMock(usageEventInsertResult);
  const monthlyUsageInitializeInsertQueryBuilder = createInsertQueryBuilderMock(
    monthlyUsageInitializeInsertResult,
  );
  const monthlyUsageIncrementQueryBuilder = createUpdateQueryBuilderMock(
    monthlyUsageIncrementResult,
  );
  const usageEventDeleteQueryBuilder = createDeleteQueryBuilderMock(usageEventDeleteResult);
  const monthlyUsageDecrementQueryBuilder = createUpdateQueryBuilderMock(
    monthlyUsageDecrementResult,
  );

  let usageEventBuilderRequestCount = 0;
  let monthlyUsageBuilderRequestCount = 0;
  const manager = {
    createQueryBuilder: jest.fn((entity?: QueryBuilderEntity) => {
      if (entity === UsageEvent) {
        const requestedBuilder =
          usageEventQueryBuilderSequence[usageEventBuilderRequestCount] ?? 'insert';
        usageEventBuilderRequestCount += 1;

        return requestedBuilder === 'delete'
          ? usageEventDeleteQueryBuilder
          : usageEventInsertQueryBuilder;
      }

      if (entity === MonthlyUsage) {
        const requestedBuilder =
          monthlyUsageQueryBuilderSequence[monthlyUsageBuilderRequestCount] ?? 'increment';
        monthlyUsageBuilderRequestCount += 1;

        if (requestedBuilder === 'initialize') {
          return monthlyUsageInitializeInsertQueryBuilder;
        }

        return requestedBuilder === 'decrement'
          ? monthlyUsageDecrementQueryBuilder
          : monthlyUsageIncrementQueryBuilder;
      }

      throw new Error(`Unexpected query builder request for ${String(entity)}`);
    }),
    getRepository: jest.fn((entity: typeof Subscription) => {
      if (entity === Subscription && subscriptionRepositoryMock) {
        return subscriptionRepositoryMock;
      }

      throw new Error(`Unexpected repository request for ${String(entity)}`);
    }),
  } as unknown as jest.Mocked<EntityManager>;

  return {
    manager,
    usageEventInsertQueryBuilder,
    monthlyUsageInitializeInsertQueryBuilder,
    monthlyUsageIncrementQueryBuilder,
    usageEventDeleteQueryBuilder,
    monthlyUsageDecrementQueryBuilder,
    transaction: jest.fn(async (callback: (entityManager: EntityManager) => Promise<unknown>) =>
      callback(manager),
    ),
  } as unknown as BillingUsageDataSourceMock;
};

function createInsertQueryBuilderMock(insertResult: InsertResult): InsertQueryBuilderMock {
  const queryBuilder = {
    insert: jest.fn(),
    into: jest.fn(),
    values: jest.fn(),
    orIgnore: jest.fn(),
    returning: jest.fn(),
    onConflict: jest.fn(),
    execute: jest.fn<Promise<InsertResult>, []>().mockResolvedValue(insertResult),
  } as InsertQueryBuilderMock;

  queryBuilder.insert.mockReturnValue(queryBuilder);
  queryBuilder.into.mockReturnValue(queryBuilder);
  queryBuilder.values.mockReturnValue(queryBuilder);
  queryBuilder.orIgnore.mockReturnValue(queryBuilder);
  queryBuilder.returning.mockReturnValue(queryBuilder);
  queryBuilder.onConflict.mockReturnValue(queryBuilder);

  return queryBuilder;
}

function createUpdateQueryBuilderMock(updateResult: UpdateResult): UpdateQueryBuilderMock {
  const queryBuilder = {
    update: jest.fn(),
    set: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    returning: jest.fn(),
    execute: jest.fn<Promise<UpdateResult>, []>().mockResolvedValue(updateResult),
  } as UpdateQueryBuilderMock;

  queryBuilder.update.mockReturnValue(queryBuilder);
  queryBuilder.set.mockReturnValue(queryBuilder);
  queryBuilder.where.mockReturnValue(queryBuilder);
  queryBuilder.andWhere.mockReturnValue(queryBuilder);
  queryBuilder.returning.mockReturnValue(queryBuilder);

  return queryBuilder;
}

function createDeleteQueryBuilderMock(deleteResult: DeleteResult): DeleteQueryBuilderMock {
  const queryBuilder = {
    delete: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    returning: jest.fn(),
    execute: jest.fn<Promise<DeleteResult>, []>().mockResolvedValue(deleteResult),
  } as DeleteQueryBuilderMock;

  queryBuilder.delete.mockReturnValue(queryBuilder);
  queryBuilder.from.mockReturnValue(queryBuilder);
  queryBuilder.where.mockReturnValue(queryBuilder);
  queryBuilder.andWhere.mockReturnValue(queryBuilder);
  queryBuilder.returning.mockReturnValue(queryBuilder);

  return queryBuilder;
}
