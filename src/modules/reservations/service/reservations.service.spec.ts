import { Logger } from '@nestjs/common';
import { PROVIDER_TEMPORARY_ERROR_MESSAGE } from 'src/constants';
import { Intention, ProviderError, ProviderName, RoleEnum } from 'src/lib';
import {
  aiCreateReservationResponseMock,
  aiUpdateReservationResponseMock,
  createAiServiceMock,
  createCacheServiceMock,
  createIntentionsRouterMock,
  simplifiedPayloadMock,
} from '../test/mocks/dependency-mocks';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let aiServiceMock = createAiServiceMock();
  let routerMock = createIntentionsRouterMock();
  let cacheServiceMock = createCacheServiceMock();

  beforeEach(() => {
    jest.clearAllMocks();

    aiServiceMock = createAiServiceMock();
    routerMock = createIntentionsRouterMock();
    cacheServiceMock = createCacheServiceMock();

    service = new ReservationsService(aiServiceMock, routerMock, cacheServiceMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should force other intention when message is only social courtesy', async () => {
    aiServiceMock.isSocialCourtesyMessage.mockResolvedValue(true);
    routerMock.route.mockResolvedValue({ reply: 'Hola, en que te ayudo?' });

    await expect(
      service.conversationOrchestrator('Hola, como estas?', simplifiedPayloadMock),
    ).resolves.toBe('Hola, en que te ayudo?');

    expect(cacheServiceMock.appendEntityMessage.mock.calls[0]).toEqual([
      simplifiedPayloadMock.waId,
      'Hola, como estas?',
      RoleEnum.USER,
    ]);
    expect(aiServiceMock.isSocialCourtesyMessage.mock.calls[0]).toEqual(['Hola, como estas?']);
    expect(routerMock.route.mock.calls[0]).toEqual([
      { intent: Intention.OTHER },
      simplifiedPayloadMock,
    ]);
    expect(cacheServiceMock.getHistory.mock.calls).toHaveLength(0);
    expect(aiServiceMock.interactWithAi.mock.calls).toHaveLength(0);
    expect(aiServiceMock.interactUpdateWithAi.mock.calls).toHaveLength(0);
  });

  it('should skip courtesy detection when message has an explicit reservation action', async () => {
    cacheServiceMock.getHistory.mockResolvedValue([{ role: RoleEnum.USER, content: 'previo' }]);
    aiServiceMock.interactWithAi.mockResolvedValue(aiCreateReservationResponseMock);
    routerMock.route.mockResolvedValue({ reply: 'Reserva creada' });

    await expect(
      service.conversationOrchestrator(
        'Quiero reservar para manana a las 21',
        simplifiedPayloadMock,
      ),
    ).resolves.toBe('Reserva creada');

    expect(aiServiceMock.isSocialCourtesyMessage.mock.calls).toHaveLength(0);
    expect(cacheServiceMock.getHistory.mock.calls[0]).toEqual([simplifiedPayloadMock.waId]);
    expect(aiServiceMock.interactWithAi.mock.calls[0]).toEqual([
      'Quiero reservar para manana a las 21',
      [{ role: RoleEnum.USER, content: 'previo' }],
    ]);
    expect(routerMock.route.mock.calls[0]).toEqual([
      aiCreateReservationResponseMock,
      simplifiedPayloadMock,
    ]);
  });

  it('should use the dedicated update extractor when the message explicitly asks to change a reservation', async () => {
    cacheServiceMock.getHistory.mockResolvedValue([{ role: RoleEnum.USER, content: 'previo' }]);
    aiServiceMock.interactUpdateWithAi.mockResolvedValue(aiUpdateReservationResponseMock);
    routerMock.route.mockResolvedValue({ reply: 'Decime el telefono' });

    await expect(
      service.conversationOrchestrator(
        'Quiero cambiar una reserva del lunes a las 21 para las 19',
        simplifiedPayloadMock,
      ),
    ).resolves.toBe('Decime el telefono');

    expect(aiServiceMock.interactUpdateWithAi.mock.calls[0]).toEqual([
      'Quiero cambiar una reserva del lunes a las 21 para las 19',
      [{ role: RoleEnum.USER, content: 'previo' }],
    ]);
    expect(aiServiceMock.interactWithAi.mock.calls).toHaveLength(0);
    expect(routerMock.route.mock.calls[0]).toEqual([
      aiUpdateReservationResponseMock,
      simplifiedPayloadMock,
    ]);
  });

  it('should continue with AI flow when non-explicit message is not a social courtesy', async () => {
    cacheServiceMock.getHistory.mockResolvedValue([{ role: RoleEnum.ASSISTANT, content: 'hola' }]);
    aiServiceMock.isSocialCourtesyMessage.mockResolvedValue(false);
    aiServiceMock.interactWithAi.mockResolvedValue({
      intent: Intention.AVAILABILITY,
      date: 'domingo 29 de marzo 2026 29/03/2026',
      time: '20:00',
    });
    routerMock.route.mockResolvedValue({ reply: 'Hay disponibilidad' });

    await expect(
      service.conversationOrchestrator('hola necesito ayuda', simplifiedPayloadMock),
    ).resolves.toBe('Hay disponibilidad');

    expect(aiServiceMock.isSocialCourtesyMessage.mock.calls[0]).toEqual(['hola necesito ayuda']);
    expect(cacheServiceMock.getHistory.mock.calls[0]).toEqual([simplifiedPayloadMock.waId]);
    expect(aiServiceMock.interactWithAi.mock.calls[0]).toEqual([
      'hola necesito ayuda',
      [{ role: RoleEnum.ASSISTANT, content: 'hola' }],
    ]);
  });

  it('should return provider temporary error and log original stack when AI provider fails', async () => {
    const originalError = new Error('timeout');
    const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.interactWithAi.mockRejectedValue(
      new ProviderError(ProviderName.OPEN_AI, 'ai failed', originalError),
    );

    await expect(
      service.conversationOrchestrator('Quiero reservar hoy', simplifiedPayloadMock),
    ).resolves.toBe(PROVIDER_TEMPORARY_ERROR_MESSAGE);

    expect(loggerErrorSpy.mock.calls[0]).toEqual([
      `Error temporal del proveedor ${ProviderName.OPEN_AI} para ${simplifiedPayloadMock.waId}`,
      originalError.stack ?? originalError.message,
    ]);
  });

  it('should return provider temporary error and log string detail when provider error has string payload', async () => {
    const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.interactWithAi.mockRejectedValue(
      new ProviderError(ProviderName.GOOGLE_SHEETS, 'sheet failed', 'quota exceeded'),
    );

    await expect(
      service.conversationOrchestrator('Quiero reservar manana', simplifiedPayloadMock),
    ).resolves.toBe(PROVIDER_TEMPORARY_ERROR_MESSAGE);

    expect(loggerErrorSpy.mock.calls[0]).toEqual([
      `Error temporal del proveedor ${ProviderName.GOOGLE_SHEETS} para ${simplifiedPayloadMock.waId}`,
      'quota exceeded',
    ]);
  });

  it('should rethrow unknown errors', async () => {
    cacheServiceMock.getHistory.mockResolvedValue([]);
    aiServiceMock.interactWithAi.mockRejectedValue(new Error('unexpected failure'));

    await expect(
      service.conversationOrchestrator('Quiero reservar hoy', simplifiedPayloadMock),
    ).rejects.toThrow('unexpected failure');
  });
});
