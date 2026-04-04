import { Intention, RoleEnum, StatusEnum, TemporalStatusEnum } from 'src/lib';
import {
  createAiServiceMock,
  createCacheServiceMock,
  createDatesServiceMock,
  simplifiedPayloadMock,
  temporalCompletedResponseMock,
  temporalFailedResponseMock,
  temporalInProgressResponseMock,
} from '../../test/mocks/dependency-mocks';
import { CreateReservationStrategy } from './create-reservation.strategy';

describe('CreateReservationStrategy', () => {
  let strategy: CreateReservationStrategy;
  let datesServiceMock = createDatesServiceMock();
  let aiServiceMock = createAiServiceMock();
  let cacheServiceMock = createCacheServiceMock();

  beforeEach(() => {
    jest.clearAllMocks();
    datesServiceMock = createDatesServiceMock();
    aiServiceMock = createAiServiceMock();
    cacheServiceMock = createCacheServiceMock();
    strategy = new CreateReservationStrategy(datesServiceMock, aiServiceMock, cacheServiceMock);
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
    expect(cacheServiceMock.markFlowCompleted.mock.calls[0]).toEqual([simplifiedPayloadMock.waId]);
  });

  it('should suggest alternative availability on failed reservation due to no availability', async () => {
    const suggestedAvailability = {
      date_label: 'domingo 29 de marzo 2026 29/03/2026',
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
      errorStatus: StatusEnum.RESERVATION_ERROR,
      message: 'Hubo un error',
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
