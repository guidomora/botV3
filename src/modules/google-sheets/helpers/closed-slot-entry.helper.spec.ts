import {
  consolidateClosedSlotEntries,
  subtractOpenRangeFromClosedSlotEntries,
} from './closed-slot-entry.helper';

describe('Given closed slot entry helpers', () => {
  it('Should consolidate overlapping and contiguous entries', () => {
    const result = consolidateClosedSlotEntries([
      {
        date: '2026-04-10',
        fromTime: '12:00',
        toTime: '14:00',
        reason: 'Primer motivo',
        createdAt: '2026-04-01T10:00:00.000Z',
        rowIndex: 1,
      },
      {
        date: '2026-04-10',
        fromTime: '14:00',
        toTime: '16:00',
        reason: 'Ultimo motivo',
        createdAt: '2026-04-01T11:00:00.000Z',
        rowIndex: 2,
      },
    ]);

    expect(result).toEqual([
      {
        date: '2026-04-10',
        fromTime: '12:00',
        toTime: '16:00',
        reason: 'Ultimo motivo',
        createdAt: '2026-04-01T11:00:00.000Z',
      },
    ]);
  });

  it('Should split an entry when opening an inner range', () => {
    const result = subtractOpenRangeFromClosedSlotEntries(
      [
        {
          date: '2026-04-10',
          fromTime: '10:00',
          toTime: '14:00',
          reason: 'Evento privado',
          createdAt: '2026-04-01T10:00:00.000Z',
        },
      ],
      '11:00',
      '12:00',
    );

    expect(result).toEqual([
      {
        date: '2026-04-10',
        fromTime: '10:00',
        toTime: '11:00',
        reason: 'Evento privado',
        createdAt: '2026-04-01T10:00:00.000Z',
      },
      {
        date: '2026-04-10',
        fromTime: '12:00',
        toTime: '14:00',
        reason: 'Evento privado',
        createdAt: '2026-04-01T10:00:00.000Z',
      },
    ]);
  });
});
