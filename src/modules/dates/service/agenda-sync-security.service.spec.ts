import { AgendaSyncSecurityService } from './agenda-sync-security.service';
import { createHmac } from 'crypto';

describe('AgendaSyncSecurityService', () => {
  afterEach(() => {
    delete process.env.AGENDA_SYNC_MAX_TIME_SKEW_MS;
    delete process.env.AGENDA_SYNC_SECRET;
  });

  it('should validate signature built from method path and timestamp', () => {
    process.env.AGENDA_SYNC_SECRET = 'super-secret';
    const service = new AgendaSyncSecurityService();
    const timestamp = '1710000000000';
    const path = '/bot/dates/ensure-agenda-window';
    const signature = createHmac('sha256', 'super-secret')
      .update(service.buildSignaturePayload('POST', path, timestamp))
      .digest('hex');

    expect(
      service.isValidSignature({
        method: 'POST',
        path,
        timestamp,
        receivedSignature: signature,
        secret: 'super-secret',
      }),
    ).toBe(true);
  });

  it('should reject expired timestamps', () => {
    process.env.AGENDA_SYNC_MAX_TIME_SKEW_MS = '300000';
    const service = new AgendaSyncSecurityService();

    expect(service.isTimestampWithinAllowedWindow('1710000000000', 1710000400001)).toBe(false);
  });

  it('should normalize signature prefix when present', () => {
    const service = new AgendaSyncSecurityService();
    const timestamp = '1710000000000';
    const path = '/bot/dates/ensure-agenda-window';
    const signature = createHmac('sha256', 'super-secret')
      .update(service.buildSignaturePayload('POST', path, timestamp))
      .digest('hex');

    expect(
      service.isValidSignature({
        method: 'POST',
        path,
        timestamp,
        receivedSignature: `sha256=${signature}`,
        secret: 'super-secret',
      }),
    ).toBe(true);
  });
});
