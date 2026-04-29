export const toMinutes = (time: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
};

export const getSlotEndTime = (time: string, reservationDurationMinutes: number): string => {
  const startMinutes = toMinutes(time);

  if (startMinutes === null) {
    return time;
  }

  const endMinutes = startMinutes + reservationDurationMinutes;
  const normalizedEndMinutes = endMinutes % (24 * 60);
  const hours = Math.floor(normalizedEndMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (normalizedEndMinutes % 60).toString().padStart(2, '0');

  return `${hours}:${minutes}`;
};

export const hasTimeOverlap = (
  leftStartTime: string,
  leftEndTime: string,
  rightStartTime: string,
  rightEndTime: string,
): boolean => {
  const leftStart = toMinutes(leftStartTime);
  const leftEnd = toMinutes(leftEndTime);
  const rightStart = toMinutes(rightStartTime);
  const rightEnd = toMinutes(rightEndTime);

  if (leftStart === null || leftEnd === null || rightStart === null || rightEnd === null) {
    return false;
  }

  return leftStart < rightEnd && rightStart < leftEnd;
};
