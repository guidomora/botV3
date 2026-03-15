import { ConfigService } from '@nestjs/config';
import { createConfigServiceMock } from './test/mocks/dependency-mocks';
import { ConversationExpirationNotifierService } from './conversation-expiration-notifier.service';

type TwilioMessagePayload = {
  body: string;
  to: string;
  from?: string;
  messagingServiceSid?: string;
};

const messagesCreateMock = jest.fn();

jest.mock('twilio', () => ({
  Twilio: jest.fn().mockImplementation(() => ({
    messages: {
      create: messagesCreateMock,
    },
  })),
}));

describe('ConversationExpirationNotifierService', () => {
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip sending when twilio is not configured', async () => {
    configService = createConfigServiceMock({});

    const service = new ConversationExpirationNotifierService(configService);

    await expect(
      service.sendConversationExpiredMessage('5491112345678', 'in_progress'),
    ).resolves.toBeUndefined();
    expect(messagesCreateMock).not.toHaveBeenCalled();
  });

  it('should send the in-progress expiration message using messaging service sid', async () => {
    configService = createConfigServiceMock({
      TWILIO_ACCOUNT_SID: 'AC123',
      TWILIO_AUTH_TOKEN: 'token',
      TWILIO_MESSAGING_SERVICE_SID: 'MG123',
    });

    const service = new ConversationExpirationNotifierService(configService);

    await service.sendConversationExpiredMessage('5491112345678', 'in_progress');

    expect(messagesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'whatsapp:5491112345678',
        messagingServiceSid: 'MG123',
      }),
    );

    const [payload] = messagesCreateMock.mock.calls[0] as [TwilioMessagePayload];
    expect(payload.body).toContain('inactividad');
    expect(payload.body).toContain('desde cero');
  });

  it('should send the completed expiration message using from whatsapp when service sid is missing', async () => {
    configService = createConfigServiceMock({
      TWILIO_ACCOUNT_SID: 'AC123',
      TWILIO_AUTH_TOKEN: 'token',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
    });

    const service = new ConversationExpirationNotifierService(configService);

    await service.sendConversationExpiredMessage('whatsapp:5491112345678', 'completed');

    expect(messagesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'whatsapp:5491112345678',
        from: 'whatsapp:+14155238886',
      }),
    );

    const [payload] = messagesCreateMock.mock.calls[0] as [TwilioMessagePayload];
    expect(payload.body).toContain('inactividad');
    expect(payload.body).toContain('nueva consulta');
  });

  it('should swallow twilio errors when message creation fails', async () => {
    configService = createConfigServiceMock({
      TWILIO_ACCOUNT_SID: 'AC123',
      TWILIO_AUTH_TOKEN: 'token',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
    });
    messagesCreateMock.mockRejectedValueOnce(new Error('twilio-failed'));

    const service = new ConversationExpirationNotifierService(configService);

    await expect(
      service.sendConversationExpiredMessage('5491112345678', 'completed'),
    ).resolves.toBeUndefined();
    expect(messagesCreateMock).toHaveBeenCalledTimes(1);
  });
});
