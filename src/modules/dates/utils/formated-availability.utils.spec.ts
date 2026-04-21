import { formatAvailabilityResponse } from './formated-availability.utils';

describe('formatAvailabilityResponse', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should map realistic availability rows from the sheet', () => {
    const result = formatAvailabilityResponse([
      ['domingo 01 de marzo 2030 01/03/2030', '16:00', '0', '42'],
      ['domingo 01 de marzo 2030 01/03/2030', '17:00', '2', '40'],
      ['domingo 01 de marzo 2030 01/03/2030', '18:00', '5', '0'],
    ]);

    expect(result).toEqual({
      date_label: 'domingo 01 de marzo 2030 01/03/2030',
      is_closed_day: false,
      columns: ['time', 'available_tables'],
      slots: [
        { time: '16:00', available_tables: 42 },
        { time: '17:00', available_tables: 40 },
      ],
      summary: { first_time: '16:00', last_time: '17:00' },
    });
  });

  it('should return an empty response when rows are missing or malformed', () => {
    const result = formatAvailabilityResponse([['Fecha'], [''], [] as unknown as string[]]);

    expect(result).toEqual({
      date_label: null,
      is_closed_day: false,
      columns: ['time', 'available_tables'],
      slots: [],
      summary: { first_time: null, last_time: null },
    });
  });

  it('should filter past slots when the requested date is today in Buenos Aires timezone', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-03-01T18:30:00.000Z'));

    const result = formatAvailabilityResponse([
      ['domingo 01 de marzo 2030 01/03/2030', '14:00', '0', '42'],
      ['domingo 01 de marzo 2030 01/03/2030', '15:00', '0', '42'],
      ['domingo 01 de marzo 2030 01/03/2030', '16:00', '0', '42'],
      ['domingo 01 de marzo 2030 01/03/2030', '17:00', '0', '42'],
    ]);

    expect(result.slots).toEqual([
      { time: '16:00', available_tables: 42 },
      { time: '17:00', available_tables: 42 },
    ]);
  });

  it('should fallback to the third column when available tables column is missing', () => {
    const result = formatAvailabilityResponse([
      ['domingo 01 de marzo 2030 01/03/2030', '18:00', '5'],
      ['domingo 01 de marzo 2030 01/03/2030', '19:00', '0'],
    ]);

    expect(result.slots).toEqual([{ time: '18:00', available_tables: 5 }]);
    expect(result.summary).toEqual({ first_time: '18:00', last_time: '18:00' });
  });

  it('should sort resulting slots chronologically even if input rows are unsorted', () => {
    const result = formatAvailabilityResponse([
      ['domingo 01 de marzo 2030 01/03/2030', '20:00', '0', '10'],
      ['domingo 01 de marzo 2030 01/03/2030', '16:00', '0', '12'],
      ['domingo 01 de marzo 2030 01/03/2030', '18:00', '0', '11'],
    ]);

    expect(result.slots).toEqual([
      { time: '16:00', available_tables: 12 },
      { time: '18:00', available_tables: 11 },
      { time: '20:00', available_tables: 10 },
    ]);
    expect(result.summary).toEqual({ first_time: '16:00', last_time: '20:00' });
  });
});
