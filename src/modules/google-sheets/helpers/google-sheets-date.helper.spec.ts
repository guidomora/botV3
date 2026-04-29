import { formatCalendarDateToIso, getNormalizedIsoDate } from './google-sheets-date.helper';

describe('Given google sheets date helpers', () => {
  it('Should format calendar labels into ISO dates', () => {
    expect(formatCalendarDateToIso('viernes 10 de abril 2026 10/04/2026')).toBe('2026-04-10');
  });

  it('Should keep ISO dates unchanged when normalizing', () => {
    expect(getNormalizedIsoDate(' 2026-04-10 ')).toBe('2026-04-10');
  });

  it('Should return null for invalid calendar labels', () => {
    expect(getNormalizedIsoDate('fila sin fecha valida')).toBeNull();
  });
});
