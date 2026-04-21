import { Intention, RoleEnum, StatusEnum } from 'src/lib';
import {
  createAiServiceMock,
  createCacheServiceMock,
  createDatesServiceMock,
  createUpdateReservationQueueServiceMock,
  simplifiedPayloadMock,
  updateStateIdentifyMock,
  updateStateReadyToRescheduleMock,
} from '../../test/mocks/dependency-mocks';
import { UpdateReservationStrategy } from './update-reservation.strategy';

describe('UpdateReservationStrategy', () => {
  let strategy: UpdateReservationStrategy;
  let datesServiceMock = createDatesServiceMock();
  let updateReservationQueueServiceMock = createUpdateReservationQueueServiceMock();
  let aiServiceMock = createAiServiceMock();
  let cacheServiceMock = createCacheServiceMock();

  beforeEach(() => {
    jest.clearAllMocks();
    datesServiceMock = createDatesServiceMock();
    updateReservationQueueServiceMock = createUpdateReservationQueueServiceMock();
    aiServiceMock = createAiServiceMock();
    cacheServiceMock = createCacheServiceMock();
    strategy = new UpdateReservationStrategy(
      datesServiceMock,
      updateReservationQueueServiceMock,
      aiServiceMock,
      cacheServiceMock,
    );
  });

  it('should ask only for phone when that is the last missing current field', async () => {
    cacheServiceMock.getUpdateState.mockResolvedValue({
      ...updateStateIdentifyMock,
      currentName: 'guido',
      currentDate: 'domingo 29 de marzo 2026 29/03/2026',
      currentTime: '21:00',
    });
    cacheServiceMock.updateUpdateState.mockResolvedValue({
      ...updateStateIdentifyMock,
      currentName: 'guido',
      currentDate: 'domingo 29 de marzo 2026 29/03/2026',
      currentTime: '21:00',
      phone: null,
    });
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.askUpdateReservationPhone.mockResolvedValue('Decime tu telefono');

    await expect(
      strategy.execute({ intent: Intention.UPDATE, currentName: 'guido' }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'Decime tu telefono',
    });

    expect(aiServiceMock.askUpdateReservationPhone.mock.calls[0]).toEqual([
      [],
      {
        ...updateStateIdentifyMock,
        currentName: 'guido',
        currentDate: 'domingo 29 de marzo 2026 29/03/2026',
        currentTime: '21:00',
        phone: null,
      },
    ]);
  });

  it('should use the current WhatsApp number when AI marks useCurrentPhone', async () => {
    cacheServiceMock.getUpdateState.mockResolvedValue({
      ...updateStateIdentifyMock,
      currentName: 'guido',
      currentDate: 'domingo 29 de marzo 2026 29/03/2026',
      currentTime: '21:00',
    });
    cacheServiceMock.updateUpdateState.mockResolvedValue({
      ...updateStateReadyToRescheduleMock,
      phone: simplifiedPayloadMock.waId,
    });
    cacheServiceMock.getHistory.mockResolvedValue([]);
    datesServiceMock.getReservationIndexByData.mockResolvedValue(12);
    aiServiceMock.askUpdateReservationData.mockResolvedValue('Que queres cambiar?');

    await expect(
      strategy.execute({ intent: Intention.UPDATE, useCurrentPhone: true }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'Que queres cambiar?',
    });

    expect(cacheServiceMock.updateUpdateState.mock.calls[0]?.[1]).toMatchObject({
      phone: simplifiedPayloadMock.waId,
    });
  });

  it('should keep current reservation data separate from the new requested target', async () => {
    cacheServiceMock.getUpdateState.mockResolvedValue(updateStateIdentifyMock);
    cacheServiceMock.updateUpdateState
      .mockResolvedValueOnce({
        ...updateStateIdentifyMock,
        currentName: 'guido',
        currentDate: 'lunes 13 de abril 2026 13/04/2026',
        currentTime: '21:00',
        newTime: '19:00',
      })
      .mockResolvedValueOnce({
        ...updateStateReadyToRescheduleMock,
        currentName: 'guido',
        currentDate: 'lunes 13 de abril 2026 13/04/2026',
        currentTime: '21:00',
        newTime: '19:00',
      });
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.askUpdateReservationPhone.mockResolvedValue('Decime tu telefono');

    await expect(
      strategy.execute(
        {
          intent: Intention.UPDATE,
          currentName: 'guido',
          currentDate: 'lunes 13 de abril 2026 13/04/2026',
          currentTime: '21:00',
          newTime: '19:00',
        },
        simplifiedPayloadMock,
      ),
    ).resolves.toEqual({
      reply: 'Decime tu telefono',
    });

    expect(cacheServiceMock.updateUpdateState.mock.calls[0]?.[1]).toEqual({
      currentName: 'guido',
      currentDate: 'lunes 13 de abril 2026 13/04/2026',
      currentTime: '21:00',
      newTime: '19:00',
    });
  });

  it('should reply when current reservation does not exist', async () => {
    cacheServiceMock.getUpdateState.mockResolvedValue(updateStateReadyToRescheduleMock);
    cacheServiceMock.updateUpdateState.mockResolvedValue(updateStateReadyToRescheduleMock);
    cacheServiceMock.getHistory.mockResolvedValue([]);
    datesServiceMock.getReservationIndexByData.mockResolvedValue(-1);

    const result = await strategy.execute({ intent: Intention.UPDATE }, simplifiedPayloadMock);

    expect(result.reply).toContain('No se encontr');
    expect(cacheServiceMock.appendEntityMessage.mock.calls[0]?.[0]).toBe(
      simplifiedPayloadMock.waId,
    );
    expect(cacheServiceMock.appendEntityMessage.mock.calls[0]?.[2]).toBe(RoleEnum.ASSISTANT);
    expect(cacheServiceMock.appendEntityMessage.mock.calls[0]?.[3]).toBe(Intention.UPDATE);
  });

  it('should ask for target change when reschedule stage has no target fields', async () => {
    cacheServiceMock.getUpdateState.mockResolvedValue(updateStateReadyToRescheduleMock);
    cacheServiceMock.updateUpdateState.mockResolvedValue(updateStateReadyToRescheduleMock);
    cacheServiceMock.getHistory.mockResolvedValue([]);
    datesServiceMock.getReservationIndexByData.mockResolvedValue(12);
    aiServiceMock.askUpdateReservationData.mockResolvedValue('Que queres cambiar?');

    await expect(
      strategy.execute({ intent: Intention.UPDATE }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'Que queres cambiar?',
    });

    expect(aiServiceMock.askUpdateReservationData.mock.calls[0]).toEqual([
      ['changeTarget'],
      [],
      updateStateReadyToRescheduleMock,
    ]);
  });

  it('should ask what to change after identifying the reservation without any new target data', async () => {
    cacheServiceMock.getUpdateState.mockResolvedValue({
      ...updateStateIdentifyMock,
      currentDate: 'domingo 29 de marzo 2026 29/03/2026',
      currentTime: '21:00',
    });
    cacheServiceMock.updateUpdateState
      .mockResolvedValueOnce({
        ...updateStateIdentifyMock,
        currentName: 'guido',
        phone: '5491112345678',
        currentDate: 'domingo 29 de marzo 2026 29/03/2026',
        currentTime: '21:00',
        stage: 'identify',
      })
      .mockResolvedValueOnce(updateStateReadyToRescheduleMock);
    cacheServiceMock.getHistory.mockResolvedValue([]);
    datesServiceMock.getReservationIndexByData.mockResolvedValue(12);
    aiServiceMock.askUpdateReservationData.mockResolvedValue('¿Qué querés cambiar?');

    await expect(
      strategy.execute(
        {
          intent: Intention.UPDATE,
          currentName: 'guido',
          currentPhone: '5491112345678',
        },
        simplifiedPayloadMock,
      ),
    ).resolves.toEqual({
      reply: '¿Qué querés cambiar?',
    });

    expect(aiServiceMock.askUpdateReservationData.mock.calls[0]).toEqual([
      ['changeTarget'],
      [],
      updateStateReadyToRescheduleMock,
    ]);
    expect(updateReservationQueueServiceMock.updateReservation.mock.calls).toHaveLength(0);
  });

  it('should ask what to change when AI repeats the same date and time as current reservation', async () => {
    const stateWithRepeatedTarget = {
      ...updateStateReadyToRescheduleMock,
      newDate: updateStateReadyToRescheduleMock.currentDate,
      newTime: updateStateReadyToRescheduleMock.currentTime,
    };

    cacheServiceMock.getUpdateState.mockResolvedValue(stateWithRepeatedTarget);
    cacheServiceMock.updateUpdateState.mockResolvedValue(stateWithRepeatedTarget);
    cacheServiceMock.getHistory.mockResolvedValue([]);
    datesServiceMock.getReservationIndexByData.mockResolvedValue(12);
    aiServiceMock.askUpdateReservationData.mockResolvedValue('¿Qué querés cambiar?');

    await expect(
      strategy.execute({ intent: Intention.UPDATE }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: '¿Qué querés cambiar?',
    });

    expect(aiServiceMock.askUpdateReservationData.mock.calls[0]).toEqual([
      ['changeTarget'],
      [],
      stateWithRepeatedTarget,
    ]);
    expect(updateReservationQueueServiceMock.updateReservation.mock.calls).toHaveLength(0);
  });

  it('should suggest alternative availability when update fails due to no availability', async () => {
    const nextState = {
      ...updateStateReadyToRescheduleMock,
      newDate: 'lunes 30 de marzo 2026 30/03/2026',
      newTime: '22:00',
    };
    const availability = {
      date_label: 'lunes 30 de marzo 2026 30/03/2026',
      is_closed_day: false,
      columns: ['time', 'available_tables'] as ['time', 'available_tables'],
      slots: [{ time: '23:00', available_tables: 1 }],
      summary: { first_time: '23:00', last_time: '23:00' },
    };

    cacheServiceMock.getUpdateState.mockResolvedValue(nextState);
    cacheServiceMock.updateUpdateState.mockResolvedValue(nextState);
    cacheServiceMock.getHistory.mockResolvedValue([]);
    datesServiceMock.getReservationIndexByData.mockResolvedValue(12);
    updateReservationQueueServiceMock.updateReservation.mockResolvedValue({
      status: StatusEnum.NO_AVAILABILITY,
      message: 'sin lugar',
      error: true,
    });
    datesServiceMock.getDayAndTimeAvailability.mockResolvedValue(availability);
    aiServiceMock.dayAndTimeAvailabilityAiResponse.mockResolvedValue('Te ofrezco 23:00');

    await expect(
      strategy.execute({ intent: Intention.UPDATE }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'Te ofrezco 23:00',
    });

    expect(datesServiceMock.getDayAndTimeAvailability.mock.calls[0]).toEqual([
      nextState.newDate,
      nextState.newTime,
    ]);
  });

  it('should clear update state and mark flow completed on successful update', async () => {
    const nextState = {
      ...updateStateReadyToRescheduleMock,
      newDate: 'lunes 30 de marzo 2026 30/03/2026',
    };

    cacheServiceMock.getUpdateState.mockResolvedValue(nextState);
    cacheServiceMock.updateUpdateState.mockResolvedValue(nextState);
    cacheServiceMock.getHistory.mockResolvedValue([]);
    datesServiceMock.getReservationIndexByData.mockResolvedValue(12);
    updateReservationQueueServiceMock.updateReservation.mockResolvedValue({
      status: StatusEnum.SUCCESS,
      message: 'Reserva actualizada',
      error: false,
    });

    await expect(
      strategy.execute({ intent: Intention.UPDATE }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'Reserva actualizada',
    });

    expect(cacheServiceMock.clearUpdateState.mock.calls[0]).toEqual([simplifiedPayloadMock.waId]);
    expect(cacheServiceMock.markFlowCompleted.mock.calls[0]).toEqual([simplifiedPayloadMock.waId]);
  });
});
