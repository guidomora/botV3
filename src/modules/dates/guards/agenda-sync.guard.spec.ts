import { ExecutionContext } from '@nestjs/common';
import { AGENDA_SYNC_SECRET_HEADER } from 'src/constants';
import { AgendaSyncGuard } from './agenda-sync.guard';

describe('AgendaSyncGuard', () => {
  const buildContext = (headerValue?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            [AGENDA_SYNC_SECRET_HEADER]: headerValue,
          },
        }),
      }),
    }) as ExecutionContext;

  afterEach(() => {
    delete process.env.AGENDA_SYNC_SECRET;
  });

  it('should allow request when header matches env secret', () => {
    process.env.AGENDA_SYNC_SECRET = 'dev-secret';
    const guard = new AgendaSyncGuard();

    expect(guard.canActivate(buildContext('dev-secret'))).toBe(true);
  });

  it('should reject request when env secret is missing', () => {
    const guard = new AgendaSyncGuard();

    expect(() => guard.canActivate(buildContext('dev-secret'))).toThrow(
      'Agenda sync is not configured',
    );
  });

  it('should reject request when header does not match env secret', () => {
    process.env.AGENDA_SYNC_SECRET = 'dev-secret';
    const guard = new AgendaSyncGuard();

    expect(() => guard.canActivate(buildContext('wrong-secret'))).toThrow(
      'Invalid agenda sync secret',
    );
  });
});
