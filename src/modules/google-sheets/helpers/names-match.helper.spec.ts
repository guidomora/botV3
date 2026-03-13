import { datesMatch, extractCalendarDate, namesMatch, normalizeDateLabel } from './names-match.helper';

describe('Given names-match helper', () => {
  describe('When namesMatch is used', () => {
    it('Should match names ignoring case, accents and repeated spaces', () => {
      expect(namesMatch('  José   Pérez ', 'jose perez')).toBe(true);
    });

    it('Should match by containment for partial names', () => {
      expect(namesMatch('maria', 'maria lopez')).toBe(true);
    });

    it('Should return false when one of the names is empty', () => {
      expect(namesMatch('', 'maria lopez')).toBe(false);
    });
  });

  describe('When date helpers are used', () => {
    it('Should extract DD/MM/YYYY from full label', () => {
      expect(extractCalendarDate('martes 03 de marzo 2026 03/03/2026')).toBe('03/03/2026');
    });

    it('Should normalize date labels', () => {
      expect(normalizeDateLabel('  MARtes   03 de marzo ')).toBe('martes 03 de marzo');
    });

    it('Should compare equal by explicit calendar date when present', () => {
      expect(datesMatch('martes 03 de marzo 2026 03/03/2026', '03/03/2026')).toBe(true);
    });
  });
});
