import { CapacityWindowInput, CapacityWindowResult } from 'src/lib';
import { parseDate, parseDateTime } from 'src/modules/dates/utils/parseDate';

export const calculateCapacityForRequestedWindow = (
  input: CapacityWindowInput,
): CapacityWindowResult => {
  const {
    date,
    time,
    requestedPeople,
    reservationDurationMinutes,
    slotIntervalMinutes,
    onlineMaxCapacity,
    availableSlotTimes,
    existingReservations,
    excludedRowIndex,
  } = input;

  const targetDate = parseDate(date).getTime();
  const requestedStartMinutes = getMinutesFromTime(time);
  const normalizedSlotIntervalMinutes = slotIntervalMinutes > 0 ? slotIntervalMinutes : 60;
  const normalizedAvailableSlotTimes = [...availableSlotTimes]
    .filter((slotTime) => Boolean(slotTime))
    .sort((slotA, slotB) => getMinutesFromTime(slotA) - getMinutesFromTime(slotB));

  const affectedSlotTimes = normalizedAvailableSlotTimes.filter((slotTime) => {
    const diffMinutes = getMinutesFromTime(slotTime) - requestedStartMinutes;
    return diffMinutes >= 0 && diffMinutes < reservationDurationMinutes;
  });

  if (affectedSlotTimes.length === 0) {
    const availableCapacity = onlineMaxCapacity;

    return {
      onlineMaxCapacity,
      affectedSlotTimes: [time],
      occupiedPeople: 0,
      availableCapacity,
      canReserve: requestedPeople <= onlineMaxCapacity,
    };
  }

  const slotOccupancy = new Map<string, number>();

  for (const slotTime of affectedSlotTimes) {
    slotOccupancy.set(
      slotTime,
      calculateOccupiedPeopleForSlot({
        slotTime,
        targetDate,
        existingReservations,
        reservationDurationMinutes,
        slotIntervalMinutes: normalizedSlotIntervalMinutes,
        excludedRowIndex,
      }),
    );
  }

  const occupiedPeople = slotOccupancy.get(time) ?? 0;
  const availableCapacity = Math.max(onlineMaxCapacity - occupiedPeople, 0);

  return {
    onlineMaxCapacity,
    affectedSlotTimes,
    occupiedPeople,
    availableCapacity,
    canReserve: affectedSlotTimes.every((slotTime) => {
      const slotOccupiedPeople = slotOccupancy.get(slotTime) ?? 0;
      return slotOccupiedPeople + requestedPeople <= onlineMaxCapacity;
    }),
  };
};

const calculateOccupiedPeopleForSlot = ({
  slotTime,
  targetDate,
  existingReservations,
  reservationDurationMinutes,
  slotIntervalMinutes,
  excludedRowIndex,
}: {
  slotTime: string;
  targetDate: number;
  existingReservations: CapacityWindowInput['existingReservations'];
  reservationDurationMinutes: number;
  slotIntervalMinutes: number;
  excludedRowIndex?: number;
}): number => {
  const slotMinutes = getMinutesFromTime(slotTime);

  return existingReservations.reduce((total, row, index) => {
    const rowNumber = index + 1;

    if (excludedRowIndex && rowNumber === excludedRowIndex) {
      return total;
    }

    const rowDate = row[0];
    const rowTime = row[1];
    const rowQuantity = Number(row[5]);

    if (!rowDate || !rowTime || Number.isNaN(rowQuantity) || rowQuantity <= 0) {
      return total;
    }

    if (parseDate(String(rowDate)).getTime() !== targetDate) {
      return total;
    }

    const reservationStart = parseDateTime(String(rowDate), String(rowTime));
    const reservationStartMinutes =
      reservationStart.getHours() * 60 + reservationStart.getMinutes();
    const diffMinutes = slotMinutes - reservationStartMinutes;

    if (diffMinutes < 0 || diffMinutes >= reservationDurationMinutes) {
      return total;
    }

    if (diffMinutes % slotIntervalMinutes !== 0) {
      return total;
    }

    return total + rowQuantity;
  }, 0);
};

const getMinutesFromTime = (time: string): number => {
  const parsedTime = parseDateTime(datePlaceholder, time);
  return parsedTime.getHours() * 60 + parsedTime.getMinutes();
};

const datePlaceholder = 'lunes 01 de enero 2001 01/01/2001';
