import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RATE_LIMIT_MESSAGE } from 'src/constants';
import { TwilioPort } from '../ports';
import { WhatsAppRateLimitGuard } from './whatsapp-rate-limit.guard';
import { RateLimitService } from '../service/rate-limit.service';
import { createRateLimitServiceMock, createTwilioPortMock } from '../test/mocks/dependency-mocks';

describe('WhatsAppRateLimitGuard', () => {
  let rateLimitServiceMock = createRateLimitServiceMock();
  let twilioPortMock = createTwilioPortMock();

  const buildContext = (waId?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          body: waId ? { WaId: waId } : {},
        }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    rateLimitServiceMock = createRateLimitServiceMock();
    twilioPortMock = createTwilioPortMock();
    jest.clearAllMocks();
  });

  it('should allow request when waId is missing', async () => {
    const guard = new WhatsAppRateLimitGuard(
      rateLimitServiceMock as unknown as RateLimitService,
      twilioPortMock as unknown as TwilioPort,
    );

    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    expect(rateLimitServiceMock.evaluateInboundMessage.mock.calls).toHaveLength(0);
  });

  it('should allow request when rate limit decision is allowed', async () => {
    rateLimitServiceMock.evaluateInboundMessage.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      shouldNotify: false,
    });
    const guard = new WhatsAppRateLimitGuard(
      rateLimitServiceMock as unknown as RateLimitService,
      twilioPortMock as unknown as TwilioPort,
    );

    await expect(guard.canActivate(buildContext('5491112345678'))).resolves.toBe(true);
  });

  it('should notify user and short-circuit request when rate limit is exceeded', async () => {
    rateLimitServiceMock.evaluateInboundMessage.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 180,
      shouldNotify: true,
    });
    twilioPortMock.sendText.mockResolvedValue({ sid: 'SM100' } as never);
    const guard = new WhatsAppRateLimitGuard(
      rateLimitServiceMock as unknown as RateLimitService,
      twilioPortMock as unknown as TwilioPort,
    );

    await expect(guard.canActivate(buildContext('5491112345678'))).rejects.toThrow(
      new HttpException({ ok: true }, HttpStatus.OK),
    );
    expect(twilioPortMock.sendText.mock.calls[0]).toEqual(['5491112345678', RATE_LIMIT_MESSAGE]);
  });

  it('should still short-circuit request when notify send fails', async () => {
    rateLimitServiceMock.evaluateInboundMessage.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 180,
      shouldNotify: true,
    });
    twilioPortMock.sendText.mockRejectedValue(new Error('twilio failed'));
    const guard = new WhatsAppRateLimitGuard(
      rateLimitServiceMock as unknown as RateLimitService,
      twilioPortMock as unknown as TwilioPort,
    );

    await expect(guard.canActivate(buildContext('5491112345678'))).rejects.toThrow(
      new HttpException({ ok: true }, HttpStatus.OK),
    );
  });

  it('should short-circuit request without notification when cooldown is active', async () => {
    rateLimitServiceMock.evaluateInboundMessage.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 180,
      shouldNotify: false,
    });
    const guard = new WhatsAppRateLimitGuard(
      rateLimitServiceMock as unknown as RateLimitService,
      twilioPortMock as unknown as TwilioPort,
    );

    await expect(guard.canActivate(buildContext('5491112345678'))).rejects.toThrow(
      new HttpException({ ok: true }, HttpStatus.OK),
    );
    expect(twilioPortMock.sendText.mock.calls).toHaveLength(0);
  });
});
