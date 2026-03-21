import { ExecutionContext } from '@nestjs/common';
import { AgendaSyncGuard } from './agenda-sync.guard';
import { AgendaSyncRateLimitService } from '../service/agenda-sync-rate-limit.service';
import { AgendaSyncReplayService } from '../service/agenda-sync-replay.service';
import { AgendaSyncSecurityService } from '../service/agenda-sync-security.service';
import { AGENDA_SYNC_SIGNATURE_HEADER, AGENDA_SYNC_TIMESTAMP_HEADER } from 'src/constants';

describe('AgendaSyncGuard', () => {
  const agendaSyncSecurityServiceMock = {
    getExpectedSecret: jest.fn(),
    normalizePath: jest.fn(),
    isTimestampWithinAllowedWindow: jest.fn(),
    isValidSignature: jest.fn(),
    getMaxTimeSkewMs: jest.fn(),
  };
  const agendaSyncReplayServiceMock = {
    isReplayRequest: jest.fn(),
  };
  const agendaSyncRateLimitServiceMock = {
    isLimitExceeded: jest.fn(),
  };

  const buildContext = (
    headers?: Record<string, string | string[] | undefined>,
    method = 'POST',
    originalUrl = '/bot/dates/ensure-agenda-window',
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: headers ?? {},
          method,
          originalUrl,
        }),
      }),
    }) as ExecutionContext;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow request when signature timestamp replay and rate limit checks pass', async () => {
    agendaSyncSecurityServiceMock.getExpectedSecret.mockReturnValue('dev-secret');
    agendaSyncSecurityServiceMock.normalizePath.mockReturnValue('/bot/dates/ensure-agenda-window');
    agendaSyncSecurityServiceMock.isTimestampWithinAllowedWindow.mockReturnValue(true);
    agendaSyncSecurityServiceMock.isValidSignature.mockReturnValue(true);
    agendaSyncSecurityServiceMock.getMaxTimeSkewMs.mockReturnValue(300000);
    agendaSyncReplayServiceMock.isReplayRequest.mockResolvedValue(false);
    agendaSyncRateLimitServiceMock.isLimitExceeded.mockResolvedValue(false);

    const guard = new AgendaSyncGuard(
      agendaSyncSecurityServiceMock as never as AgendaSyncSecurityService,
      agendaSyncReplayServiceMock as never as AgendaSyncReplayService,
      agendaSyncRateLimitServiceMock as never as AgendaSyncRateLimitService,
    );

    await expect(
      guard.canActivate(
        buildContext({
          [AGENDA_SYNC_TIMESTAMP_HEADER]: '1710000000',
          [AGENDA_SYNC_SIGNATURE_HEADER]: 'signed-request',
        }),
      ),
    ).resolves.toBe(true);
  });

  it('should reject request when env secret is missing', async () => {
    agendaSyncSecurityServiceMock.getExpectedSecret.mockReturnValue(undefined);
    const guard = new AgendaSyncGuard(
      agendaSyncSecurityServiceMock as never as AgendaSyncSecurityService,
      agendaSyncReplayServiceMock as never as AgendaSyncReplayService,
      agendaSyncRateLimitServiceMock as never as AgendaSyncRateLimitService,
    );

    await expect(guard.canActivate(buildContext())).rejects.toThrow(
      'Agenda sync is not configured',
    );
  });

  it('should reject request when timestamp is outside allowed window', async () => {
    agendaSyncSecurityServiceMock.getExpectedSecret.mockReturnValue('dev-secret');
    agendaSyncSecurityServiceMock.normalizePath.mockReturnValue('/bot/dates/ensure-agenda-window');
    agendaSyncSecurityServiceMock.isTimestampWithinAllowedWindow.mockReturnValue(false);
    const guard = new AgendaSyncGuard(
      agendaSyncSecurityServiceMock as never as AgendaSyncSecurityService,
      agendaSyncReplayServiceMock as never as AgendaSyncReplayService,
      agendaSyncRateLimitServiceMock as never as AgendaSyncRateLimitService,
    );

    await expect(
      guard.canActivate(
        buildContext({
          [AGENDA_SYNC_TIMESTAMP_HEADER]: '1710000000',
          [AGENDA_SYNC_SIGNATURE_HEADER]: 'signed-request',
        }),
      ),
    ).rejects.toThrow('Expired agenda sync request');
  });
});
