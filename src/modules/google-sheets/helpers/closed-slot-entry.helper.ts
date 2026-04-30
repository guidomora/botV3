import { ClosedSlotEntry, ClosedSlotSummary, NormalizedClosedSlotEntry } from 'src/lib';
import { toMinutes } from './google-sheets-time.helper';

export const consolidateClosedSlotEntries = (
  entries: ClosedSlotEntry[],
): NormalizedClosedSlotEntry[] =>
  [...entries]
    .sort((left, right) => {
      const leftStart = toMinutes(left.fromTime) ?? 0;
      const rightStart = toMinutes(right.fromTime) ?? 0;

      if (leftStart !== rightStart) {
        return leftStart - rightStart;
      }

      const leftCreatedAt = left.createdAt ?? '';
      const rightCreatedAt = right.createdAt ?? '';

      if (leftCreatedAt !== rightCreatedAt) {
        return leftCreatedAt.localeCompare(rightCreatedAt);
      }

      return (left.rowIndex ?? 0) - (right.rowIndex ?? 0);
    })
    .reduce<NormalizedClosedSlotEntry[]>((accumulator, currentEntry) => {
      const lastEntry = accumulator[accumulator.length - 1];
      const currentCreatedAt = currentEntry.createdAt ?? new Date().toISOString();

      if (
        !lastEntry ||
        lastEntry.date !== currentEntry.date ||
        (toMinutes(currentEntry.fromTime) ?? 0) > (toMinutes(lastEntry.toTime) ?? 0)
      ) {
        accumulator.push({
          date: currentEntry.date,
          fromTime: currentEntry.fromTime,
          toTime: currentEntry.toTime,
          reason: currentEntry.reason,
          createdAt: currentCreatedAt,
        });

        return accumulator;
      }

      if ((toMinutes(currentEntry.toTime) ?? 0) > (toMinutes(lastEntry.toTime) ?? 0)) {
        lastEntry.toTime = currentEntry.toTime;
      }

      if (currentCreatedAt >= lastEntry.createdAt) {
        lastEntry.reason = currentEntry.reason;
        lastEntry.createdAt = currentCreatedAt;
      }

      return accumulator;
    }, []);

export const subtractOpenRangeFromClosedSlotEntries = (
  entries: ClosedSlotEntry[],
  fromTime: string,
  toTime: string,
): NormalizedClosedSlotEntry[] => {
  const openStart = toMinutes(fromTime);
  const openEnd = toMinutes(toTime);

  if (openStart === null || openEnd === null || openStart >= openEnd) {
    return [];
  }

  return entries.flatMap((entry) => {
    const closedStart = toMinutes(entry.fromTime);
    const closedEnd = toMinutes(entry.toTime);
    const createdAt = entry.createdAt ?? new Date().toISOString();

    if (closedStart === null || closedEnd === null) {
      return [];
    }

    if (closedEnd <= openStart || closedStart >= openEnd) {
      return [
        {
          date: entry.date,
          fromTime: entry.fromTime,
          toTime: entry.toTime,
          reason: entry.reason,
          createdAt,
        },
      ];
    }

    const remainingEntries: NormalizedClosedSlotEntry[] = [];

    if (closedStart < openStart) {
      remainingEntries.push({
        date: entry.date,
        fromTime: entry.fromTime,
        toTime: fromTime,
        reason: entry.reason,
        createdAt,
      });
    }

    if (openEnd < closedEnd) {
      remainingEntries.push({
        date: entry.date,
        fromTime: toTime,
        toTime: entry.toTime,
        reason: entry.reason,
        createdAt,
      });
    }

    return remainingEntries;
  });
};

export const getClosedSlotsByDate = (
  closedSlots: ClosedSlotEntry[],
  date: string,
): ClosedSlotSummary[] =>
  closedSlots
    .filter((entry) => entry.date === date)
    .map(({ fromTime, toTime, reason }) => ({
      fromTime,
      toTime,
      reason,
    }));
