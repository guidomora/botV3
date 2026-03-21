jest.mock('twilio', () => ({
  validateRequest: jest.fn(),
}));

import { ConfigService } from '@nestjs/config';
import { validateRequest } from 'twilio';
import { TwilioAdapter } from './twilio.adapter';
import { createConfigServiceMock } from '../test/mocks/dependency-mocks';

describe('TwilioAdapter', () => {
  let configServiceMock = createConfigServiceMock({});

  const createTwilioClientMock = () => ({
    messages: {
      create: jest.fn(),
    },
  });

  beforeEach(() => {
    configServiceMock = createConfigServiceMock({
      'twilio.fromWhatsApp': 'whatsapp:+5491100000000',
      'twilio.messagingServiceSid': undefined,
    });
    jest.clearAllMocks();
  });

  it('should send text using from number when messaging service sid is not configured', async () => {
    const twilioClientMock = createTwilioClientMock();
    twilioClientMock.messages.create.mockResolvedValue({ sid: 'SM123' });
    const adapter = new TwilioAdapter(
      twilioClientMock as never,
      configServiceMock as unknown as ConfigService,
    );

    await expect(adapter.sendText('5491112345678', 'Hola')).resolves.toEqual({ sid: 'SM123' });
    expect(twilioClientMock.messages.create).toHaveBeenCalledWith({
      body: 'Hola',
      to: 'whatsapp:5491112345678',
      from: 'whatsapp:+5491100000000',
    });
  });

  it('should send text using messaging service sid when configured', async () => {
    const twilioClientMock = createTwilioClientMock();
    twilioClientMock.messages.create.mockResolvedValue({ sid: 'SM456' });
    configServiceMock = createConfigServiceMock({
      'twilio.fromWhatsApp': 'whatsapp:+5491100000000',
      'twilio.messagingServiceSid': 'MG123',
    });
    const adapter = new TwilioAdapter(
      twilioClientMock as never,
      configServiceMock as unknown as ConfigService,
    );

    await adapter.sendText('whatsapp:5491112345678', 'Hola');

    expect(twilioClientMock.messages.create).toHaveBeenCalledWith({
      body: 'Hola',
      to: 'whatsapp:5491112345678',
      messagingServiceSid: 'MG123',
    });
  });

  it('should throw when neither from nor messaging service sid is configured', () => {
    const twilioClientMock = createTwilioClientMock();
    configServiceMock = createConfigServiceMock({
      'twilio.fromWhatsApp': undefined,
      'twilio.messagingServiceSid': undefined,
    });

    expect(
      () =>
        new TwilioAdapter(twilioClientMock as never, configServiceMock as unknown as ConfigService),
    ).toThrow('Configurar TWILIO_WHATSAPP_FROM o TWILIO_MESSAGING_SERVICE_SID');
  });

  it('should delegate signature validation to twilio sdk helper', () => {
    process.env.TWILIO_AUTH_TOKEN = 'token123';
    (validateRequest as jest.Mock).mockReturnValue(true);
    const twilioClientMock = createTwilioClientMock();
    const adapter = new TwilioAdapter(
      twilioClientMock as never,
      configServiceMock as unknown as ConfigService,
    );

    expect(adapter.verifySignature('https://bot.example.com', { Body: 'Hola' }, 'sig')).toBe(true);
    expect(validateRequest).toHaveBeenCalledWith('token123', 'sig', 'https://bot.example.com', {
      Body: 'Hola',
    });
  });
});
