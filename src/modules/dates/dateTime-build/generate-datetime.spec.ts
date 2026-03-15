import { GenerateDatetime } from './generate-datetime';

describe('GenerateDatetime', () => {
  let generateDatetime: GenerateDatetime;

  beforeEach(() => {
    generateDatetime = new GenerateDatetime();
    process.env.MAX_CAPACITY_TOTAL = '50';
    process.env.ONLINE_BUFFER_PERCENT = '16';
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.MAX_CAPACITY_TOTAL;
    delete process.env.ONLINE_BUFFER_PERCENT;
  });

  it('should create date-time rows for a specific day', () => {
    const rows = generateDatetime.createDateTime('domingo 01 de marzo 2030 01/03/2030');

    expect(rows[0]).toEqual(['', '']);
    expect(rows[2]).toEqual(['domingo 01 de marzo 2030 01/03/2030', '12:00']);
    expect(rows[12]).toEqual(['domingo 01 de marzo 2030 01/03/2030', '22:00']);
    expect(rows[13]).toEqual(['', '']);
  });

  it('should create date-time rows with bookings and computed capacity', () => {
    const rows = generateDatetime.createOneDayWithBookings('domingo 01 de marzo 2030 01/03/2030');

    expect(rows[2]).toEqual(['domingo 01 de marzo 2030 01/03/2030', '12:00', '0', '42']);
    expect(rows[12]).toEqual(['domingo 01 de marzo 2030 01/03/2030', '22:00', '0', '42']);
  });

  it('should create current day label from system date', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-01T15:00:00.000Z'));

    expect(generateDatetime.createOneDay()).toBe('domingo 01 de marzo 2026 01/03/2026');
  });

  it('should create a past day label', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-10T15:00:00.000Z'));

    expect(generateDatetime.createPastDay(5)).toBe('jueves 05 de marzo 2026 05/03/2026');
  });

  it('should create next day from a provided date', () => {
    expect(generateDatetime.createNextDay(new Date(2026, 2, 1))).toBe(
      'lunes 02 de marzo 2026 02/03/2026',
    );
  });
});
