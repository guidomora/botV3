import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppController } from './whatsapp.controller';
import { TwilioSignatureGuard } from '../guards/twilio-signature.guard';
import { WhatsAppIdempotencyGuard } from '../guards/whatsapp-idempotency.guard';
import { WhatsAppRateLimitGuard } from '../guards/whatsapp-rate-limit.guard';
import { WhatsAppUsageLimitGuard } from '../guards/whatsapp-usage-limit.guard';
import { WhatsAppService } from '../service/whatsapp.service';
import { createWhatsAppServiceMock, simplifiedPayloadMock } from '../test/mocks/dependency-mocks';
import { ClosureNotificationOperationService } from 'src/modules/reservation-jobs/service/closure-notification-operation.service';
import { GUARDS_METADATA } from '@nestjs/common/constants';

describe('WhatsAppController', () => {
  let controller: WhatsAppController;
  let whatsappServiceMock = createWhatsAppServiceMock();
  let closureNotificationOperationServiceMock = {
    handleMessageStatusCallback: jest.fn(),
  };

  beforeEach(async () => {
    whatsappServiceMock = createWhatsAppServiceMock();
    closureNotificationOperationServiceMock = {
      handleMessageStatusCallback: jest.fn(),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [
        {
          provide: WhatsAppService,
          useValue: whatsappServiceMock,
        },
        {
          provide: ClosureNotificationOperationService,
          useValue: closureNotificationOperationServiceMock,
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
    moduleBuilder
      .overrideGuard(WhatsAppUsageLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get(WhatsAppController);
  });

  it('should run usage limit guard before processing inbound whatsapp messages', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      WhatsAppController.prototype,
      'handleMultipleMessages',
    );
    const handler = descriptor?.value as object | undefined;

    expect(handler).toBeDefined();

    expect(Reflect.getMetadata(GUARDS_METADATA, handler as object) as unknown).toEqual([
      TwilioSignatureGuard,
      WhatsAppIdempotencyGuard,
      WhatsAppUsageLimitGuard,
      WhatsAppRateLimitGuard,
    ]);
  });

  it('should reply with unsupported message when payload contains media', async () => {
    whatsappServiceMock.getUnsupportedMessageReply.mockReturnValue('Solo texto');
    whatsappServiceMock.handleInboundMessage.mockResolvedValue(undefined);

    await expect(
      controller.handleMultipleMessages(
        'Hola',
        {
          Body: 'Hola',
          From: simplifiedPayloadMock.from,
          To: 'whatsapp:+5491100000000',
          WaId: simplifiedPayloadMock.waId,
          ProfileName: simplifiedPayloadMock.profileName,
          MessageSid: simplifiedPayloadMock.messageSid,
          AccountSid: simplifiedPayloadMock.accountSid,
          NumMedia: '1',
          MessageType: 'image',
        },
        simplifiedPayloadMock.from,
      ),
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
      controller.handleMultipleMessages(
        'Quiero reservar',
        {
          Body: 'Quiero reservar',
          From: simplifiedPayloadMock.from,
          To: 'whatsapp:+5491100000000',
          WaId: simplifiedPayloadMock.waId,
          ProfileName: simplifiedPayloadMock.profileName,
          MessageSid: simplifiedPayloadMock.messageSid,
          AccountSid: simplifiedPayloadMock.accountSid,
          NumMedia: '0',
          MessageType: 'text',
        },
        simplifiedPayloadMock.from,
      ),
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
      controller.handleMultipleMessages(
        'Mensaje',
        {
          Body: 'Mensaje',
          From: simplifiedPayloadMock.from,
          To: 'whatsapp:+5491100000000',
          WaId: simplifiedPayloadMock.waId,
          ProfileName: simplifiedPayloadMock.profileName,
          MessageSid: simplifiedPayloadMock.messageSid,
          AccountSid: simplifiedPayloadMock.accountSid,
          NumMedia: '0',
          MessageType: 'text',
        },
        simplifiedPayloadMock.from,
      ),
    ).resolves.toEqual({ ok: true });

    expect(whatsappServiceMock.handleInboundMessage.mock.calls).toHaveLength(0);
  });

  it('should delegate Twilio message status callbacks to closure notification operation service', async () => {
    closureNotificationOperationServiceMock.handleMessageStatusCallback.mockResolvedValue(
      undefined,
    );

    await expect(
      controller.handleMessageStatusCallback({
        MessageSid: 'SM123',
        MessageStatus: 'failed',
        ErrorCode: '63016',
        ErrorMessage: 'Failed to send',
      }),
    ).resolves.toEqual({ ok: true });

    expect(
      closureNotificationOperationServiceMock.handleMessageStatusCallback.mock.calls[0],
    ).toEqual([
      {
        MessageSid: 'SM123',
        MessageStatus: 'failed',
        ErrorCode: '63016',
        ErrorMessage: 'Failed to send',
      },
    ]);
  });
});
