import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TwilioSignatureGuard } from './twilio-signature.guard';
import { createWhatsAppServiceMock, simplifiedPayloadMock } from '../test/mocks/dependency-mocks';
import { WhatsAppService } from '../service/whatsapp.service';

describe('TwilioSignatureGuard', () => {
  let whatsAppServiceMock = createWhatsAppServiceMock();

  const buildContext = (
    overrides?: Partial<{
      headers: Record<string, string | string[] | undefined>;
      protocol: string;
      originalUrl: string;
      host: string | undefined;
    }>,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: overrides?.headers ?? {},
          body: {
            Body: simplifiedPayloadMock.body,
          },
          protocol: overrides?.protocol,
          originalUrl: overrides?.originalUrl ?? '/communication/queue',
          get: (name: string) => (name === 'host' ? overrides?.host : undefined),
        }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    whatsAppServiceMock = createWhatsAppServiceMock();
    jest.clearAllMocks();
  });

  it('should allow request when signature is valid', () => {
    whatsAppServiceMock.verifySignature.mockReturnValue(true);
    const guard = new TwilioSignatureGuard(whatsAppServiceMock as unknown as WhatsAppService);

    expect(
      guard.canActivate(
        buildContext({
          headers: {
            'x-twilio-signature': 'signed',
            'x-forwarded-proto': 'https',
            'x-forwarded-host': 'bot.example.com',
          },
        }),
      ),
    ).toBe(true);

    expect(whatsAppServiceMock.verifySignature.mock.calls[0]).toEqual([
      'https://bot.example.com/communication/queue',
      { Body: simplifiedPayloadMock.body },
      'signed',
    ]);
  });

  it('should reject request when signature header is missing', () => {
    const guard = new TwilioSignatureGuard(whatsAppServiceMock as unknown as WhatsAppService);

    expect(() => guard.canActivate(buildContext())).toThrow(
      new ForbiddenException('Invalid Twilio signature'),
    );
  });

  it('should reject request when signature is invalid', () => {
    whatsAppServiceMock.verifySignature.mockReturnValue(false);
    const guard = new TwilioSignatureGuard(whatsAppServiceMock as unknown as WhatsAppService);

    expect(() =>
      guard.canActivate(
        buildContext({
          headers: {
            'x-twilio-signature': 'bad-signature',
            host: 'localhost:3000',
          },
          protocol: 'http',
          host: 'localhost:3000',
        }),
      ),
    ).toThrow(new ForbiddenException('Invalid Twilio signature'));
  });

  it('should reject request when host cannot be resolved', () => {
    const guard = new TwilioSignatureGuard(whatsAppServiceMock as unknown as WhatsAppService);

    expect(() =>
      guard.canActivate(
        buildContext({
          headers: {
            'x-twilio-signature': 'signed',
          },
        }),
      ),
    ).toThrow(new ForbiddenException('Unable to resolve request host'));
  });
});
