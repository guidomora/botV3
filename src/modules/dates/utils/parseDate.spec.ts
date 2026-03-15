import { parseDate, parseDateTime } from './parseDate';

describe('parseDate', () => {
  it('should parse a full sheet label using dd/mm/yyyy suffix', () => {
    const parsed = parseDate('domingo 01 de marzo 2030 01/03/2030');

    expect(parsed.getFullYear()).toBe(2030);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(1);
  });

  it('should throw when date does not contain a valid dd/mm/yyyy suffix', () => {
    expect(() => parseDate('domingo 01 de marzo 2030')).toThrow('Formato de fecha');
  });
});

describe('parseDateTime', () => {
  it('should parse date and time including minutes', () => {
    const parsed = parseDateTime('domingo 01 de marzo 2030 01/03/2030', '16:30');

    expect(parsed.getHours()).toBe(16);
    expect(parsed.getMinutes()).toBe(30);
  });

  it('should return date without modifying time when time is omitted', () => {
    const parsed = parseDateTime('domingo 01 de marzo 2030 01/03/2030');

    expect(parsed.getFullYear()).toBe(2030);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(1);
  });

  it('should accept hour-only values and default minutes to zero', () => {
    const parsed = parseDateTime('domingo 01 de marzo 2030 01/03/2030', '16');

    expect(parsed.getHours()).toBe(16);
    expect(parsed.getMinutes()).toBe(0);
  });

  it('should throw when time format is invalid', () => {
    expect(() => parseDateTime('domingo 01 de marzo 2030 01/03/2030', 'tarde')).toThrow(
      'Formato de hora',
    );
  });
});
