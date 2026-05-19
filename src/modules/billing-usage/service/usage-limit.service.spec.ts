import { BillingPeriodService } from './billing-period.service';
import { MonthlyUsage } from '../entities/monthly-usage.entity';
import { Subscription } from '../entities/subscription.entity';
import {
  BillingUsageDataSourceMock,
  createBillingPeriodServiceMock,
  createDataSourceMock,
  createMonthlyUsageRepositoryMock,
  createSubscriptionRepositoryMock,
} from '../test/mocks/dependency-mocks';
import { UsageLimitService } from './usage-limit.service';
import { SubscriptionStatus, UsageEventType } from 'src/lib';
import { LessThanOrEqual, MoreThan } from 'typeorm';

describe('UsageLimitService', () => {
  const accountId = 'account-1';
  const period = '2026-05';
  const now = new Date('2026-05-18T12:00:00.000Z');

  let billingPeriodServiceMock = createBillingPeriodServiceMock();
  let subscriptionRepositoryMock = createSubscriptionRepositoryMock();
  let monthlyUsageRepositoryMock = createMonthlyUsageRepositoryMock();
  let dataSourceMock: BillingUsageDataSourceMock = createDataSourceMock({});
  let service: UsageLimitService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);

    billingPeriodServiceMock = createBillingPeriodServiceMock();
    subscriptionRepositoryMock = createSubscriptionRepositoryMock();
    monthlyUsageRepositoryMock = createMonthlyUsageRepositoryMock();
    dataSourceMock = createDataSourceMock({
      subscriptionRepositoryMock,
      usageEventQueryBuilderSequence: ['insert'],
      monthlyUsageQueryBuilderSequence: ['initialize', 'increment'],
    });

    billingPeriodServiceMock.getCurrentPeriod.mockReturnValue(period);

    service = new UsageLimitService(
      dataSourceMock,
      billingPeriodServiceMock as unknown as BillingPeriodService,
      subscriptionRepositoryMock as never,
      monthlyUsageRepositoryMock as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deberia permitir crear reserva cuando hay suscripcion activa y consumo por debajo del limite', async () => {
    subscriptionRepositoryMock.findOne.mockResolvedValue({
      id: 'subscription-1',
      accountId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      plan: {
        id: 'plan-1',
        isActive: true,
        monthlyWhatsappReservationLimit: 10,
      },
    } as Subscription);
    monthlyUsageRepositoryMock.findOne.mockResolvedValue({
      id: 'usage-1',
      accountId,
      period,
      whatsappReservationsUsed: 3,
    } as MonthlyUsage);

    await expect(service.canCreateWhatsappReservation(accountId)).resolves.toEqual({
      allowed: true,
    });
    expect(subscriptionRepositoryMock.findOne).toHaveBeenCalledWith({
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
  });

  it('deberia bloquear cuando no existe una suscripcion activa para el periodo actual', async () => {
    subscriptionRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.canCreateWhatsappReservation(accountId)).resolves.toEqual({
      allowed: false,
      reason: 'missing_active_subscription',
    });
  });

  it('deberia bloquear cuando la suscripcion activa usa un plan inactivo', async () => {
    subscriptionRepositoryMock.findOne.mockResolvedValue({
      id: 'subscription-1',
      accountId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      plan: {
        id: 'plan-1',
        isActive: false,
        monthlyWhatsappReservationLimit: 10,
      },
    } as Subscription);

    await expect(service.canCreateWhatsappReservation(accountId)).resolves.toEqual({
      allowed: false,
      reason: 'inactive_plan',
    });
  });

  it('deberia bloquear cuando el consumo mensual alcanzo el limite del plan', async () => {
    subscriptionRepositoryMock.findOne.mockResolvedValue({
      id: 'subscription-1',
      accountId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      plan: {
        id: 'plan-1',
        isActive: true,
        monthlyWhatsappReservationLimit: 3,
      },
    } as Subscription);
    monthlyUsageRepositoryMock.findOne.mockResolvedValue({
      id: 'usage-1',
      accountId,
      period,
      whatsappReservationsUsed: 3,
    } as MonthlyUsage);

    await expect(service.canCreateWhatsappReservation(accountId)).resolves.toEqual({
      allowed: false,
      reason: 'limit_reached',
    });
  });

  it('deberia consumir cuota de forma atomica cuando hay capacidad disponible', async () => {
    subscriptionRepositoryMock.findOne.mockResolvedValue({
      id: 'subscription-1',
      accountId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      plan: {
        id: 'plan-1',
        isActive: true,
        monthlyWhatsappReservationLimit: 10,
      },
    } as Subscription);

    await expect(
      service.consumeWhatsappReservationQuota({
        accountId,
        idempotencyKey: 'event-1',
        metadata: { source: 'test' },
      }),
    ).resolves.toEqual({
      allowed: true,
      alreadyConsumed: false,
    });

    expect(dataSourceMock.transaction.mock.calls).toHaveLength(1);
    expect(subscriptionRepositoryMock.findOne).toHaveBeenCalledWith({
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
    expect(dataSourceMock.usageEventInsertQueryBuilder.values).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId,
        idempotencyKey: 'event-1',
        period,
        eventType: UsageEventType.WHATSAPP_RESERVATION_CREATED,
        quantity: 1,
        metadata: { source: 'test' },
      }),
    );
    expect(dataSourceMock.monthlyUsageInitializeInsertQueryBuilder.values).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId,
        period,
        whatsappReservationsUsed: 0,
      }),
    );
    expect(dataSourceMock.monthlyUsageIncrementQueryBuilder.execute).toHaveBeenCalledTimes(1);
  });

  it('deberia devolver allowed true idempotente cuando el evento ya existia', async () => {
    subscriptionRepositoryMock.findOne.mockResolvedValue({
      id: 'subscription-1',
      accountId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      plan: {
        id: 'plan-1',
        isActive: true,
        monthlyWhatsappReservationLimit: 10,
      },
    } as Subscription);
    dataSourceMock = createDataSourceMock({
      subscriptionRepositoryMock,
      usageEventInsertResult: {
        identifiers: [],
        generatedMaps: [],
        raw: [],
      },
      usageEventQueryBuilderSequence: ['insert'],
    });
    service = new UsageLimitService(
      dataSourceMock,
      billingPeriodServiceMock as unknown as BillingPeriodService,
      subscriptionRepositoryMock as never,
      monthlyUsageRepositoryMock as never,
    );

    await expect(
      service.consumeWhatsappReservationQuota({
        accountId,
        idempotencyKey: 'event-1',
        metadata: { source: 'test' },
      }),
    ).resolves.toEqual({
      allowed: true,
      alreadyConsumed: true,
    });

    expect(dataSourceMock.monthlyUsageInitializeInsertQueryBuilder.execute).not.toHaveBeenCalled();
    expect(dataSourceMock.monthlyUsageIncrementQueryBuilder.execute).not.toHaveBeenCalled();
  });

  it('deberia bloquear el consumo atomico cuando no queda capacidad del plan', async () => {
    subscriptionRepositoryMock.findOne.mockResolvedValue({
      id: 'subscription-1',
      accountId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      plan: {
        id: 'plan-1',
        isActive: true,
        monthlyWhatsappReservationLimit: 3,
      },
    } as Subscription);
    dataSourceMock = createDataSourceMock({
      subscriptionRepositoryMock,
      monthlyUsageIncrementResult: {
        generatedMaps: [],
        raw: [],
        affected: 0,
      },
      usageEventQueryBuilderSequence: ['insert'],
      monthlyUsageQueryBuilderSequence: ['initialize', 'increment'],
    });
    service = new UsageLimitService(
      dataSourceMock,
      billingPeriodServiceMock as unknown as BillingPeriodService,
      subscriptionRepositoryMock as never,
      monthlyUsageRepositoryMock as never,
    );

    await expect(
      service.consumeWhatsappReservationQuota({
        accountId,
        idempotencyKey: 'event-1',
        metadata: { source: 'test' },
      }),
    ).resolves.toEqual({
      allowed: false,
      reason: 'limit_reached',
    });
  });

  it('deberia bloquear el consumo atomico cuando el plan esta inactivo', async () => {
    subscriptionRepositoryMock.findOne.mockResolvedValue({
      id: 'subscription-1',
      accountId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      plan: {
        id: 'plan-1',
        isActive: false,
        monthlyWhatsappReservationLimit: 10,
      },
    } as Subscription);

    await expect(
      service.consumeWhatsappReservationQuota({
        accountId,
        idempotencyKey: 'event-1',
        metadata: { source: 'test' },
      }),
    ).resolves.toEqual({
      allowed: false,
      reason: 'inactive_plan',
    });

    expect(dataSourceMock.usageEventInsertQueryBuilder.execute.mock.calls).toHaveLength(0);
    expect(dataSourceMock.monthlyUsageIncrementQueryBuilder.execute.mock.calls).toHaveLength(0);
  });

  it('deberia liberar la cuota consumida cuando existe el evento', async () => {
    dataSourceMock = createDataSourceMock({
      subscriptionRepositoryMock,
      usageEventQueryBuilderSequence: ['delete'],
      monthlyUsageQueryBuilderSequence: ['decrement'],
    });
    service = new UsageLimitService(
      dataSourceMock,
      billingPeriodServiceMock as unknown as BillingPeriodService,
      subscriptionRepositoryMock as never,
      monthlyUsageRepositoryMock as never,
    );

    await expect(
      service.releaseWhatsappReservationQuota({
        accountId,
        idempotencyKey: 'event-1',
      }),
    ).resolves.toEqual({
      released: true,
    });

    expect(dataSourceMock.usageEventDeleteQueryBuilder.returning).toHaveBeenCalledWith('period');
    expect(dataSourceMock.monthlyUsageDecrementQueryBuilder.execute).toHaveBeenCalledTimes(1);
  });

  it('deberia no decrementar el agregado mensual cuando no habia evento para compensar', async () => {
    dataSourceMock = createDataSourceMock({
      subscriptionRepositoryMock,
      usageEventQueryBuilderSequence: ['delete'],
      monthlyUsageQueryBuilderSequence: ['decrement'],
      usageEventDeleteResult: {
        raw: [],
        affected: 0,
      },
    });
    service = new UsageLimitService(
      dataSourceMock,
      billingPeriodServiceMock as unknown as BillingPeriodService,
      subscriptionRepositoryMock as never,
      monthlyUsageRepositoryMock as never,
    );

    await expect(
      service.releaseWhatsappReservationQuota({
        accountId,
        idempotencyKey: 'event-1',
      }),
    ).resolves.toEqual({
      released: false,
    });

    expect(dataSourceMock.monthlyUsageDecrementQueryBuilder.execute).not.toHaveBeenCalled();
  });
});
