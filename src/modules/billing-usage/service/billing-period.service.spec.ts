import { BillingPeriodService } from './billing-period.service';

describe('BillingPeriodService', () => {
  let service: BillingPeriodService;

  beforeEach(() => {
    service = new BillingPeriodService();
  });

  it('deberia devolver el periodo actual en formato YYYY-MM usando UTC', () => {
    const period = service.getCurrentPeriod(new Date('2026-05-18T12:00:00.000Z'));

    expect(period).toBe('2026-05');
  });

  it('deberia devolver el inicio y fin exclusivo del periodo en UTC', () => {
    const bounds = service.getPeriodBounds('2026-05');

    expect(bounds.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });
});
