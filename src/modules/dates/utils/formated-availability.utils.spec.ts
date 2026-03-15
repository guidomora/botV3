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
});
