import { getSlotEndTime, hasTimeOverlap, toMinutes } from './google-sheets-time.helper';

describe('Given google sheets time helpers', () => {
  it('Should convert valid HH:mm values to minutes', () => {
    expect(toMinutes('20:30')).toBe(1230);
  });

  it('Should reject invalid HH:mm values', () => {
    expect(toMinutes('24:00')).toBeNull();
    expect(toMinutes('20:99')).toBeNull();
  });

  it('Should calculate slot end time using the provided duration', () => {
    expect(getSlotEndTime('20:00', 120)).toBe('22:00');
  });

  it('Should detect overlapping time ranges', () => {
    expect(hasTimeOverlap('20:00', '22:00', '21:00', '23:00')).toBe(true);
    expect(hasTimeOverlap('20:00', '22:00', '22:00', '23:00')).toBe(false);
  });
});
