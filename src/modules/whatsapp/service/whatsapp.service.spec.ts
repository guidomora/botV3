import { UNSUPPORTED_MESSAGE } from 'src/constants';
import { WhatsAppService } from './whatsapp.service';
import {
  createReservationsServiceMock,
  createTwilioPortMock,
  simplifiedPayloadMock,
} from '../test/mocks/dependency-mocks';

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let twilioPortMock = createTwilioPortMock();
  let reservationsServiceMock = createReservationsServiceMock();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    twilioPortMock = createTwilioPortMock();
    reservationsServiceMock = createReservationsServiceMock();
    service = new WhatsAppService(twilioPortMock, reservationsServiceMock);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should delegate sendText to Twilio adapter', async () => {
    twilioPortMock.sendText.mockResolvedValue({ sid: 'SM999' } as never);

    await expect(service.sendText('5491112345678', 'Hola')).resolves.toEqual({ sid: 'SM999' });
    expect(twilioPortMock.sendText.mock.calls[0]).toEqual(['5491112345678', 'Hola']);
  });

  it('should return unsupported message constant', () => {
    expect(service.getUnsupportedMessageReply()).toBe(UNSUPPORTED_MESSAGE);
  });

  it('should send inbound message reply to waId', async () => {
    const sendTextSpy = jest
      .spyOn(service, 'sendText')
      .mockResolvedValue({ sid: 'SM111' } as never);

    await service.handleInboundMessage(simplifiedPayloadMock, 'Texto de respuesta');

    expect(sendTextSpy.mock.calls[0]).toEqual([simplifiedPayloadMock.waId, 'Texto de respuesta']);
  });

  it('should delegate signature verification to adapter', () => {
    twilioPortMock.verifySignature.mockReturnValue(true);

    expect(
      service.verifySignature('https://host/communication/queue', { Body: 'Hola' }, 'sig'),
    ).toBe(true);
    expect(twilioPortMock.verifySignature.mock.calls[0]).toEqual([
      'https://host/communication/queue',
      { Body: 'Hola' },
      'sig',
    ]);
  });

  it('should aggregate buffered messages and resolve only the latest promise with the response', async () => {
    reservationsServiceMock.conversationOrchestrator.mockResolvedValue('Reserva creada');

    const firstPromise = service.handleMultipleMessages(simplifiedPayloadMock, 'Hola');
    const secondPromise = service.handleMultipleMessages(simplifiedPayloadMock, 'quiero reservar');

    await jest.advanceTimersByTimeAsync(25000);

    await expect(firstPromise).resolves.toBeUndefined();
    await expect(secondPromise).resolves.toBe('Reserva creada');
    expect(reservationsServiceMock.conversationOrchestrator.mock.calls[0]).toEqual([
      'Hola quiero reservar',
      simplifiedPayloadMock,
    ]);
  });

  it('should resolve pending promises with undefined when buffered processing fails', async () => {
    reservationsServiceMock.conversationOrchestrator.mockRejectedValue(
      new Error('provider failed'),
    );

    const firstPromise = service.handleMultipleMessages(simplifiedPayloadMock, 'Hola');
    const secondPromise = service.handleMultipleMessages(simplifiedPayloadMock, 'necesito ayuda');

    await jest.advanceTimersByTimeAsync(25000);

    await expect(firstPromise).resolves.toBeUndefined();
    await expect(secondPromise).resolves.toBeUndefined();
    expect((service as unknown as { buffers: Map<string, unknown> }).buffers.size).toBe(0);
  });
});
