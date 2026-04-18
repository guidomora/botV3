import { CacheTypeEnum, Intention, RoleEnum } from 'src/lib';
import {
  cancelStateMock,
  createAiServiceMock,
  createCacheServiceMock,
  createDeleteReservationQueueServiceMock,
  createDatesServiceMock,
  simplifiedPayloadMock,
} from '../../test/mocks/dependency-mocks';
import { DeleteReservationStrategy } from './delete-reservation.strategy';

describe('DeleteReservationStrategy', () => {
  let strategy: DeleteReservationStrategy;
  let datesServiceMock = createDatesServiceMock();
  let deleteReservationQueueServiceMock = createDeleteReservationQueueServiceMock();
  let aiServiceMock = createAiServiceMock();
  let cacheServiceMock = createCacheServiceMock();

  beforeEach(() => {
    jest.clearAllMocks();
    datesServiceMock = createDatesServiceMock();
    deleteReservationQueueServiceMock = createDeleteReservationQueueServiceMock();
    aiServiceMock = createAiServiceMock();
    cacheServiceMock = createCacheServiceMock();
    strategy = new DeleteReservationStrategy(
      datesServiceMock,
      deleteReservationQueueServiceMock,
      aiServiceMock,
      cacheServiceMock,
    );
  });

  it('should ask for missing cancel data when state is incomplete', async () => {
    cacheServiceMock.updateCancelState.mockResolvedValue({
      ...cancelStateMock,
      time: null,
    });
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.getMissingDataToCancel.mockResolvedValue('Decime el horario');

    await expect(
      strategy.execute({ intent: Intention.CANCEL, name: 'guido' }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'Decime el horario',
    });

    expect(aiServiceMock.getMissingDataToCancel.mock.calls[0]).toEqual([
      ['time'],
      [],
      { ...cancelStateMock, time: null },
    ]);
    expect(cacheServiceMock.appendEntityMessage.mock.calls[0]).toEqual([
      simplifiedPayloadMock.waId,
      'Decime el horario',
      RoleEnum.ASSISTANT,
      Intention.CANCEL,
    ]);
  });

  it('should delete reservation, clear cancel cache and mark flow completed', async () => {
    cacheServiceMock.updateCancelState.mockResolvedValue(cancelStateMock);
    deleteReservationQueueServiceMock.deleteReservation.mockResolvedValue('Reserva cancelada');
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.cancelReservationResult.mockResolvedValue('Listo, la cancelamos');

    await expect(
      strategy.execute({ intent: Intention.CANCEL, name: 'guido' }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'Listo, la cancelamos',
    });

    expect(deleteReservationQueueServiceMock.deleteReservation.mock.calls[0]).toEqual([
      cancelStateMock,
    ]);
    expect(cacheServiceMock.clearHistory.mock.calls[0]).toEqual([
      simplifiedPayloadMock.waId,
      CacheTypeEnum.CANCEL,
    ]);
    expect(cacheServiceMock.markFlowCompleted.mock.calls[0]).toEqual([simplifiedPayloadMock.waId]);
  });
});
