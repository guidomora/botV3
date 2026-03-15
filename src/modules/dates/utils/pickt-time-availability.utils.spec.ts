import { AvailabilityResponse } from 'src/lib';
import { pickAvailabilityForTime } from './pickt-time-availability.utils';

describe('pickAvailabilityForTime', () => {
  const day: AvailabilityResponse = {
    date_label: 'domingo 01 de marzo 2030 01/03/2030',
    columns: ['time', 'available_tables'],
    slots: [
      { time: '12:00', available_tables: 42 },
      { time: '13:00', available_tables: 42 },
      { time: '15:00', available_tables: 40 },
      { time: '16:00', available_tables: 39 },
      { time: '18:00', available_tables: 37 },
    ],
    summary: { first_time: '12:00', last_time: '18:00' },
  };

  it('should return exact slot when requested time exists', () => {
    const result = pickAvailabilityForTime(day, '15:00');

    expect(result.slots).toEqual([{ time: '15:00', available_tables: 40 }]);
    expect(result.summary).toEqual({ first_time: '15:00', last_time: '15:00' });
  });

  it('should return closest chronological suggestions when exact match does not exist', () => {
    const result = pickAvailabilityForTime(day, '14:00', {
      neighborCount: 2,
      slotIntervalMinutes: 60,
    });

    expect(result.slots).toEqual([
      { time: '13:00', available_tables: 42 },
      { time: '15:00', available_tables: 40 },
    ]);
  });

  it('should return an empty response when there are no slots', () => {
    const result = pickAvailabilityForTime(
      {
        ...day,
        slots: [],
        summary: { first_time: null, last_time: null },
      },
      '14:00',
    );

    expect(result.slots).toEqual([]);
    expect(result.summary).toEqual({ first_time: null, last_time: null });
  });

  it('should fill suggestions using the implemented left-right expansion order', () => {
    const result = pickAvailabilityForTime(day, '17:00', {
      neighborCount: 3,
      slotIntervalMinutes: 30,
    });

    expect(result.slots).toEqual([
      { time: '12:00', available_tables: 42 },
      { time: '13:00', available_tables: 42 },
      { time: '15:00', available_tables: 40 },
    ]);
  });
});
