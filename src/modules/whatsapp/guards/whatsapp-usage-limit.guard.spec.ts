import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import {
  DEFAULT_ACCOUNT_ID,
  WHATSAPP_QUOTA_BLOCKED_REPLY,
} from 'src/modules/billing-usage/constants/billing-usage.constants';
import { UsageLimitService } from 'src/modules/billing-usage/service/usage-limit.service';
import { TwilioPort } from '../ports';
import { createTwilioPortMock, createUsageLimitServiceMock } from '../test/mocks/dependency-mocks';
import { WhatsAppUsageLimitGuard } from './whatsapp-usage-limit.guard';

describe('WhatsAppUsageLimitGuard', () => {
  let usageLimitServiceMock = createUsageLimitServiceMock();
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
    usageLimitServiceMock = createUsageLimitServiceMock();
    twilioPortMock = createTwilioPortMock();
    jest.clearAllMocks();
  });

  it('should allow request when waId is missing', async () => {
    const guard = new WhatsAppUsageLimitGuard(
      usageLimitServiceMock as unknown as UsageLimitService,
      twilioPortMock as unknown as TwilioPort,
    );

    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    expect(usageLimitServiceMock.canCreateWhatsappReservation.mock.calls).toHaveLength(0);
  });

  it('should allow request when whatsapp reservation quota is available', async () => {
    usageLimitServiceMock.canCreateWhatsappReservation.mockResolvedValue({
      allowed: true,
    });
    const guard = new WhatsAppUsageLimitGuard(
      usageLimitServiceMock as unknown as UsageLimitService,
      twilioPortMock as unknown as TwilioPort,
    );

    await expect(guard.canActivate(buildContext('5491112345678'))).resolves.toBe(true);
    expect(usageLimitServiceMock.canCreateWhatsappReservation.mock.calls[0]).toEqual([
      DEFAULT_ACCOUNT_ID,
    ]);
    expect(twilioPortMock.sendText.mock.calls).toHaveLength(0);
  });

  it('should notify user and short-circuit request when quota is exhausted', async () => {
    usageLimitServiceMock.canCreateWhatsappReservation.mockResolvedValue({
      allowed: false,
      reason: 'limit_reached',
    });
    twilioPortMock.sendText.mockResolvedValue({ sid: 'SM100' } as never);
    const guard = new WhatsAppUsageLimitGuard(
      usageLimitServiceMock as unknown as UsageLimitService,
      twilioPortMock as unknown as TwilioPort,
    );

    await expect(guard.canActivate(buildContext('5491112345678'))).rejects.toThrow(
      new HttpException({ ok: true }, HttpStatus.OK),
    );
    expect(twilioPortMock.sendText.mock.calls[0]).toEqual([
      '5491112345678',
      WHATSAPP_QUOTA_BLOCKED_REPLY,
    ]);
  });

  it('should short-circuit request when quota check fails', async () => {
    usageLimitServiceMock.canCreateWhatsappReservation.mockRejectedValue(new Error('db failed'));
    twilioPortMock.sendText.mockResolvedValue({ sid: 'SM100' } as never);
    const guard = new WhatsAppUsageLimitGuard(
      usageLimitServiceMock as unknown as UsageLimitService,
      twilioPortMock as unknown as TwilioPort,
    );

    await expect(guard.canActivate(buildContext('5491112345678'))).rejects.toThrow(
      new HttpException({ ok: true }, HttpStatus.OK),
    );
    expect(twilioPortMock.sendText.mock.calls[0]).toEqual([
      '5491112345678',
      WHATSAPP_QUOTA_BLOCKED_REPLY,
    ]);
  });
});
