import { Intention, RoleEnum, StatusEnum, TemporalStatusEnum } from 'src/lib';
import {
  createAiServiceMock,
  createCacheServiceMock,
  createDatesServiceMock,
  createReservationQueueServiceMock as buildCreateReservationQueueServiceMock,
  createUsageLimitServiceMock,
  simplifiedPayloadMock,
  temporalCompletedResponseMock,
  temporalFailedResponseMock,
  temporalInProgressResponseMock,
} from '../../test/mocks/dependency-mocks';
import { CreateReservationStrategy } from './create-reservation.strategy';
import { UsageLimitService } from 'src/modules/billing-usage/service/usage-limit.service';
import { CreateReservationQueueError } from 'src/modules/reservation-jobs/errors/create-reservation-queue.error';

describe('CreateReservationStrategy', () => {
  let strategy: CreateReservationStrategy;
  let datesServiceMock = createDatesServiceMock();
  let createReservationQueueServiceMock = buildCreateReservationQueueServiceMock();
  let aiServiceMock = createAiServiceMock();
  let cacheServiceMock = createCacheServiceMock();
  let usageLimitServiceMock = createUsageLimitServiceMock();
  const quotaBlockedReply =
    'No puedo confirmar nuevas reservas por WhatsApp en este momento. Escribinos por contacto directo y te ayudamos manualmente.';

  beforeEach(() => {
    jest.clearAllMocks();
    datesServiceMock = createDatesServiceMock();
    createReservationQueueServiceMock = buildCreateReservationQueueServiceMock();
    aiServiceMock = createAiServiceMock();
    cacheServiceMock = createCacheServiceMock();
    usageLimitServiceMock = createUsageLimitServiceMock();
    strategy = new CreateReservationStrategy(
      datesServiceMock,
      createReservationQueueServiceMock,
      aiServiceMock,
      cacheServiceMock,
      usageLimitServiceMock as unknown as UsageLimitService,
    );
  });

  it('should ask for missing data while reservation is in progress', async () => {
    datesServiceMock.createReservationWithMultipleMessages.mockResolvedValue(
      temporalInProgressResponseMock,
    );
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.getMissingData.mockResolvedValue('Decime la fecha');

    await expect(
      strategy.execute(
        {
          intent: Intention.CREATE,
          name: 'guido',
          useCurrentPhone: true,
        },
        simplifiedPayloadMock,
      ),
    ).resolves.toEqual({
      reply: 'Decime la fecha',
    });

    expect(datesServiceMock.createReservationWithMultipleMessages.mock.calls[0]).toEqual([
      {
        waId: simplifiedPayloadMock.waId,
        values: {
          phone: simplifiedPayloadMock.waId,
          date: undefined,
          time: undefined,
          name: 'guido',
          quantity: undefined,
        },
      },
    ]);
    expect(cacheServiceMock.appendEntityMessage.mock.calls[0]).toEqual([
      simplifiedPayloadMock.waId,
      'Decime la fecha',
      RoleEnum.ASSISTANT,
      Intention.CREATE,
    ]);
    expect(usageLimitServiceMock.consumeWhatsappReservationQuota.mock.calls).toHaveLength(0);
  });

  it('should pass early availability validation message when date must be chosen again', async () => {
    datesServiceMock.createReservationWithMultipleMessages.mockResolvedValue({
      ...temporalInProgressResponseMock,
      missingFields: ['date', 'time'],
      message: 'Esa fecha todavia no esta disponible en la agenda. Por favor elegi otra fecha.',
      errorStatus: StatusEnum.NO_DATE_FOUND,
    });
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.getMissingData.mockResolvedValue('No tengo ese dia cargado. Decime otra fecha.');

    await expect(
      strategy.execute({ intent: Intention.CREATE, useCurrentPhone: true }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'No tengo ese dia cargado. Decime otra fecha.',
    });

    expect(aiServiceMock.getMissingData.mock.calls[0]).toEqual([
      ['date', 'time'],
      [],
      'Esa fecha todavia no esta disponible en la agenda. Por favor elegi otra fecha.',
    ]);
  });

  it('should complete reservation and mark flow as completed', async () => {
    datesServiceMock.createReservationWithMultipleMessages.mockResolvedValue(
      temporalCompletedResponseMock,
    );
    usageLimitServiceMock.consumeWhatsappReservationQuota.mockResolvedValue({
      allowed: true,
      alreadyConsumed: false,
    });
    createReservationQueueServiceMock.createReservation.mockResolvedValue({
      status: StatusEnum.SUCCESS,
      message: 'created',
      error: false,
    });
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.reservationCompleted.mockResolvedValue('Reserva creada');

    await expect(
      strategy.execute({ intent: Intention.CREATE, useCurrentPhone: true }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'Reserva creada',
    });

    expect(aiServiceMock.reservationCompleted.mock.calls[0]).toEqual([
      temporalCompletedResponseMock.reservationData,
      [],
    ]);
    expect(createReservationQueueServiceMock.createReservation.mock.calls[0]).toEqual([
      {
        date: 'domingo 29 de marzo 2026 29/03/2026',
        time: '21:00',
        name: 'guido',
        phone: '5491112345678',
        quantity: 2,
      },
    ]);
    expect(datesServiceMock.deleteTemporalReservationRow.mock.calls[0]).toEqual([9]);
    expect(cacheServiceMock.markFlowCompleted.mock.calls[0]).toEqual([simplifiedPayloadMock.waId]);
    expect(usageLimitServiceMock.consumeWhatsappReservationQuota.mock.calls).toHaveLength(1);
    expect(usageLimitServiceMock.consumeWhatsappReservationQuota.mock.calls[0]).toEqual([
      {
        accountId: 'default',
        idempotencyKey: 'whatsapp-reservation:SM123',
        metadata: {
          waId: simplifiedPayloadMock.waId,
          messageSid: simplifiedPayloadMock.messageSid,
        },
      },
    ]);
    expect(usageLimitServiceMock.releaseWhatsappReservationQuota.mock.calls).toHaveLength(0);
  });

  it('should block completed reservation when whatsapp quota is exhausted', async () => {
    datesServiceMock.createReservationWithMultipleMessages.mockResolvedValue(
      temporalCompletedResponseMock,
    );
    usageLimitServiceMock.consumeWhatsappReservationQuota.mockResolvedValue({
      allowed: false,
      reason: 'limit_reached',
    });
    cacheServiceMock.getHistory.mockResolvedValue([]);

    await expect(
      strategy.execute({ intent: Intention.CREATE, useCurrentPhone: true }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: quotaBlockedReply,
    });

    expect(createReservationQueueServiceMock.createReservation.mock.calls).toHaveLength(0);
    expect(cacheServiceMock.appendEntityMessage.mock.calls).toContainEqual([
      simplifiedPayloadMock.waId,
      quotaBlockedReply,
      RoleEnum.ASSISTANT,
      Intention.CREATE,
    ]);
  });

  it('should ask for date again when queued creation fails because date already passed', async () => {
    datesServiceMock.createReservationWithMultipleMessages.mockResolvedValue(
      temporalCompletedResponseMock,
    );
    usageLimitServiceMock.consumeWhatsappReservationQuota.mockResolvedValue({
      allowed: true,
      alreadyConsumed: false,
    });
    createReservationQueueServiceMock.createReservation.mockResolvedValue({
      status: StatusEnum.DATE_ALREADY_PASSED,
      message: 'fecha pasada',
      error: true,
    });
    datesServiceMock.clearTemporalReservationFields.mockResolvedValue({
      status: TemporalStatusEnum.IN_PROGRESS,
      missingFields: ['date', 'time'],
      reservationData: temporalCompletedResponseMock.reservationData,
    });
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.getMissingData.mockResolvedValue('Decime otra fecha');

    await expect(
      strategy.execute({ intent: Intention.CREATE, useCurrentPhone: true }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'Decime otra fecha',
    });

    expect(datesServiceMock.clearTemporalReservationFields.mock.calls[0]).toEqual([
      simplifiedPayloadMock.waId,
      ['date', 'time'],
    ]);
    expect(usageLimitServiceMock.releaseWhatsappReservationQuota.mock.calls).toContainEqual([
      {
        accountId: 'default',
        idempotencyKey: 'whatsapp-reservation:SM123',
      },
    ]);
  });

  it('should suggest alternative availability on failed reservation due to no availability', async () => {
    const suggestedAvailability = {
      date_label: 'domingo 29 de marzo 2026 29/03/2026',
      is_closed_day: false,
      columns: ['time', 'available_tables'] as ['time', 'available_tables'],
      slots: [{ time: '22:00', available_tables: 2 }],
      summary: { first_time: '22:00', last_time: '22:00' },
    };
    datesServiceMock.createReservationWithMultipleMessages.mockResolvedValue(
      temporalFailedResponseMock,
    );
    cacheServiceMock.getHistory.mockResolvedValue([]);
    datesServiceMock.getDayAndTimeAvailability.mockResolvedValue(suggestedAvailability);
    aiServiceMock.dayAndTimeAvailabilityAiResponse.mockResolvedValue('Te ofrezco 22:00');

    await expect(
      strategy.execute({ intent: Intention.CREATE, useCurrentPhone: true }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'Te ofrezco 22:00',
    });

    expect(datesServiceMock.getDayAndTimeAvailability.mock.calls[0]).toEqual([
      temporalFailedResponseMock.reservationData.date,
      temporalFailedResponseMock.reservationData.time,
    ]);
  });

  it('should use generic failed reservation response for other failures', async () => {
    datesServiceMock.createReservationWithMultipleMessages.mockResolvedValue({
      ...temporalFailedResponseMock,
      status: TemporalStatusEnum.COMPLETED,
    });
    usageLimitServiceMock.consumeWhatsappReservationQuota.mockResolvedValue({
      allowed: true,
      alreadyConsumed: false,
    });
    createReservationQueueServiceMock.createReservation.mockResolvedValue({
      status: StatusEnum.RESERVATION_ERROR,
      message: 'Hubo un error',
      error: true,
    });
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.createReservationFailed.mockResolvedValue('No pude crear la reserva');

    await expect(
      strategy.execute({ intent: Intention.CREATE, useCurrentPhone: true }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'No pude crear la reserva',
    });

    expect(aiServiceMock.createReservationFailed.mock.calls[0]).toEqual([
      temporalFailedResponseMock.reservationData,
      [],
      'Hubo un error',
    ]);
    expect(usageLimitServiceMock.releaseWhatsappReservationQuota.mock.calls).toContainEqual([
      {
        accountId: 'default',
        idempotencyKey: 'whatsapp-reservation:SM123',
      },
    ]);
  });

  it('should keep quota consumed when queue rejects after enqueue state is unknown', async () => {
    datesServiceMock.createReservationWithMultipleMessages.mockResolvedValue({
      ...temporalFailedResponseMock,
      status: TemporalStatusEnum.COMPLETED,
    });
    usageLimitServiceMock.consumeWhatsappReservationQuota.mockResolvedValue({
      allowed: true,
      alreadyConsumed: false,
    });
    createReservationQueueServiceMock.createReservation.mockRejectedValue(
      new CreateReservationQueueError('queue completion unavailable', true),
    );
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.createReservationFailed.mockResolvedValue('No pude crear la reserva');

    await expect(
      strategy.execute({ intent: Intention.CREATE, useCurrentPhone: true }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'No pude crear la reserva',
    });

    expect(usageLimitServiceMock.releaseWhatsappReservationQuota.mock.calls).toHaveLength(0);
    expect(aiServiceMock.createReservationFailed.mock.calls).toContainEqual([
      temporalFailedResponseMock.reservationData,
      [],
      'queue completion unavailable',
    ]);
  });

  it('should release quota when queue creation fails before enqueue', async () => {
    datesServiceMock.createReservationWithMultipleMessages.mockResolvedValue({
      ...temporalFailedResponseMock,
      status: TemporalStatusEnum.COMPLETED,
    });
    usageLimitServiceMock.consumeWhatsappReservationQuota.mockResolvedValue({
      allowed: true,
      alreadyConsumed: false,
    });
    createReservationQueueServiceMock.createReservation.mockRejectedValue(
      new CreateReservationQueueError('queue unavailable', false),
    );
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.createReservationFailed.mockResolvedValue('No pude crear la reserva');

    await expect(
      strategy.execute({ intent: Intention.CREATE, useCurrentPhone: true }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'No pude crear la reserva',
    });

    expect(usageLimitServiceMock.releaseWhatsappReservationQuota.mock.calls).toContainEqual([
      {
        accountId: 'default',
        idempotencyKey: 'whatsapp-reservation:SM123',
      },
    ]);
    expect(aiServiceMock.createReservationFailed.mock.calls).toContainEqual([
      temporalFailedResponseMock.reservationData,
      [],
      'queue unavailable',
    ]);
  });

  it('should log structured context when quota compensation fails after queue failure', async () => {
    const loggerErrorSpy = jest.spyOn(strategy['logger'], 'error').mockImplementation();
    datesServiceMock.createReservationWithMultipleMessages.mockResolvedValue(
      temporalCompletedResponseMock,
    );
    usageLimitServiceMock.consumeWhatsappReservationQuota.mockResolvedValue({
      allowed: true,
      alreadyConsumed: false,
    });
    createReservationQueueServiceMock.createReservation.mockResolvedValue({
      status: StatusEnum.RESERVATION_ERROR,
      message: 'Hubo un error',
      error: true,
    });
    usageLimitServiceMock.releaseWhatsappReservationQuota.mockRejectedValue(
      new Error('db unavailable'),
    );
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.createReservationFailed.mockResolvedValue('No pude crear la reserva');

    await expect(
      strategy.execute({ intent: Intention.CREATE, useCurrentPhone: true }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'No pude crear la reserva',
    });

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to release WhatsApp reservation quota after queue error',
        accountId: 'default',
        idempotencyKey: 'whatsapp-reservation:SM123',
        waId: simplifiedPayloadMock.waId,
        messageSid: simplifiedPayloadMock.messageSid,
        phone: '5491112345678',
        date: 'domingo 29 de marzo 2026 29/03/2026',
        time: '21:00',
        error: 'db unavailable',
      }),
    );
    loggerErrorSpy.mockRestore();
  });

  it('should fallback on unexpected temporal status', async () => {
    datesServiceMock.createReservationWithMultipleMessages.mockResolvedValue({
      ...temporalInProgressResponseMock,
      status: 'UNKNOWN' as TemporalStatusEnum,
    });
    cacheServiceMock.getHistory.mockResolvedValue([]);

    const result = await strategy.execute(
      { intent: Intention.CREATE, useCurrentPhone: true },
      simplifiedPayloadMock,
    );

    expect(result.reply).toContain('Hubo un problema al procesar la reserva');
  });
});
