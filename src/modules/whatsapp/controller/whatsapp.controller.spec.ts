import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { TwilioSignatureGuard } from '../guards/twilio-signature.guard';
import { WhatsAppIdempotencyGuard } from '../guards/whatsapp-idempotency.guard';
import { WhatsAppRateLimitGuard } from '../guards/whatsapp-rate-limit.guard';
import { WhatsAppService } from '../service/whatsapp.service';
import { createWhatsAppServiceMock, simplifiedPayloadMock } from '../test/mocks/dependency-mocks';
import * as request from 'supertest';

describe('WhatsAppController', () => {
  let controller: WhatsAppController;
  let whatsappServiceMock = createWhatsAppServiceMock();
  let app: INestApplication;

  beforeEach(async () => {
    whatsappServiceMock = createWhatsAppServiceMock();

    const moduleBuilder = Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [
        {
          provide: WhatsAppService,
          useValue: whatsappServiceMock,
        },
      ],
    });

    moduleBuilder
      .overrideGuard(TwilioSignatureGuard)
      .useValue({ canActivate: jest.fn(() => true) });
    moduleBuilder
      .overrideGuard(WhatsAppIdempotencyGuard)
      .useValue({ canActivate: jest.fn(() => true) });
    moduleBuilder
      .overrideGuard(WhatsAppRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get(WhatsAppController);
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should reply with unsupported message when payload contains media', async () => {
    whatsappServiceMock.getUnsupportedMessageReply.mockReturnValue('Solo texto');
    whatsappServiceMock.handleInboundMessage.mockResolvedValue(undefined);

    await expect(
      controller.handleMultipleMessages({
        Body: 'Hola',
        From: simplifiedPayloadMock.from,
        To: 'whatsapp:+5491100000000',
        WaId: simplifiedPayloadMock.waId,
        ProfileName: simplifiedPayloadMock.profileName,
        MessageSid: simplifiedPayloadMock.messageSid,
        AccountSid: simplifiedPayloadMock.accountSid,
        NumMedia: '1',
        MessageType: 'image',
      }),
    ).resolves.toEqual({ ok: true });

    expect(whatsappServiceMock.getUnsupportedMessageReply.mock.calls).toHaveLength(1);
    expect(whatsappServiceMock.handleInboundMessage.mock.calls[0]).toEqual([
      expect.objectContaining({
        body: 'Hola',
        from: simplifiedPayloadMock.from,
        waId: simplifiedPayloadMock.waId,
        profileName: simplifiedPayloadMock.profileName,
        messageSid: simplifiedPayloadMock.messageSid,
        accountSid: simplifiedPayloadMock.accountSid,
        messageType: 'image',
      }),
      'Solo texto',
    ]);
    expect(whatsappServiceMock.handleMultipleMessages.mock.calls).toHaveLength(0);
  });

  it('should send orchestrated response when service returns a message', async () => {
    whatsappServiceMock.handleMultipleMessages.mockResolvedValue('Reserva creada');
    whatsappServiceMock.handleInboundMessage.mockResolvedValue(undefined);

    await expect(
      controller.handleMultipleMessages({
        Body: 'Quiero reservar',
        From: simplifiedPayloadMock.from,
        To: 'whatsapp:+5491100000000',
        WaId: simplifiedPayloadMock.waId,
        ProfileName: simplifiedPayloadMock.profileName,
        MessageSid: simplifiedPayloadMock.messageSid,
        AccountSid: simplifiedPayloadMock.accountSid,
        NumMedia: '0',
        MessageType: 'text',
      }),
    ).resolves.toEqual({ ok: true });

    expect(whatsappServiceMock.handleMultipleMessages.mock.calls[0]).toEqual([
      expect.objectContaining({
        body: 'Quiero reservar',
        from: simplifiedPayloadMock.from,
        waId: simplifiedPayloadMock.waId,
        profileName: simplifiedPayloadMock.profileName,
        messageSid: simplifiedPayloadMock.messageSid,
        accountSid: simplifiedPayloadMock.accountSid,
        messageType: 'text',
      }),
      'Quiero reservar',
    ]);
    expect(whatsappServiceMock.handleInboundMessage.mock.calls[0]).toEqual([
      expect.objectContaining({
        body: 'Quiero reservar',
        waId: simplifiedPayloadMock.waId,
      }),
      'Reserva creada',
    ]);
  });

  it('should return ok without outbound message when service returns undefined', async () => {
    whatsappServiceMock.handleMultipleMessages.mockResolvedValue(undefined);

    await expect(
      controller.handleMultipleMessages({
        Body: 'Mensaje',
        From: simplifiedPayloadMock.from,
        To: 'whatsapp:+5491100000000',
        WaId: simplifiedPayloadMock.waId,
        ProfileName: simplifiedPayloadMock.profileName,
        MessageSid: simplifiedPayloadMock.messageSid,
        AccountSid: simplifiedPayloadMock.accountSid,
        NumMedia: '0',
        MessageType: 'text',
      }),
    ).resolves.toEqual({ ok: true });

    expect(whatsappServiceMock.handleInboundMessage.mock.calls).toHaveLength(0);
  });

  it('should accept extra Twilio metadata when global forbidNonWhitelisted is enabled', async () => {
    whatsappServiceMock.handleMultipleMessages.mockResolvedValue('Reserva creada');
    whatsappServiceMock.handleInboundMessage.mockResolvedValue(undefined);
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .post('/communication/queue')
      .send({
        Body: 'Quiero reservar',
        From: simplifiedPayloadMock.from,
        To: 'whatsapp:+5491100000000',
        WaId: simplifiedPayloadMock.waId,
        ProfileName: simplifiedPayloadMock.profileName,
        MessageSid: simplifiedPayloadMock.messageSid,
        AccountSid: simplifiedPayloadMock.accountSid,
        NumMedia: '0',
        MessageType: 'text',
        SmsSid: 'SM123',
        SmsMessageSid: 'SM123',
        NumSegments: '1',
        ApiVersion: '2010-04-01',
      })
      .expect(201, { ok: true });

    expect(whatsappServiceMock.handleMultipleMessages.mock.calls[0]).toEqual([
      expect.objectContaining({
        body: 'Quiero reservar',
        from: simplifiedPayloadMock.from,
        waId: simplifiedPayloadMock.waId,
        profileName: simplifiedPayloadMock.profileName,
        messageSid: simplifiedPayloadMock.messageSid,
        accountSid: simplifiedPayloadMock.accountSid,
        messageType: 'text',
      }),
      'Quiero reservar',
    ]);
  });

  it('should reject requests without required Twilio fields', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .post('/communication/queue')
      .send({
        Body: 'Quiero reservar',
        From: simplifiedPayloadMock.from,
        To: 'whatsapp:+5491100000000',
        ProfileName: simplifiedPayloadMock.profileName,
        MessageSid: simplifiedPayloadMock.messageSid,
        AccountSid: simplifiedPayloadMock.accountSid,
        NumMedia: '0',
        MessageType: 'text',
      })
      .expect(400);

    expect(whatsappServiceMock.handleMultipleMessages.mock.calls).toHaveLength(0);
    expect(whatsappServiceMock.handleInboundMessage.mock.calls).toHaveLength(0);
  });
});
