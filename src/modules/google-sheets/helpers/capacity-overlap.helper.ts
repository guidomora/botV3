import { DateTime } from 'src/lib/types/datetime/datetime.type';
import { parseDateTime } from 'src/modules/dates/utils/parseDate';

export interface CapacityWindowInput {
  date: string;
  time: string;
  requestedPeople: number;
  reservationDurationMinutes: number;
  onlineMaxCapacity: number;
  existingReservations: DateTime;
  excludedRowIndex?: number;
}

export interface CapacityWindowResult {
  onlineMaxCapacity: number;
  overlappingReservations: DateTime;
  occupiedPeople: number;
  availableCapacity: number;
  canReserve: boolean;
}

export const calculateCapacityForRequestedWindow = (
  input: CapacityWindowInput,
): CapacityWindowResult => {
  const {
    date,
    time,
    requestedPeople,
    reservationDurationMinutes,
    onlineMaxCapacity,
    existingReservations,
    excludedRowIndex,
  } = input;

  const requestedStart = parseDateTime(date, time);
  const requestedEnd = new Date(requestedStart.getTime() + reservationDurationMinutes * 60000);

  const overlappingReservations = existingReservations.filter((row, index) => {
    const rowNumber = index + 1;

    if (excludedRowIndex && rowNumber === excludedRowIndex) {
      return false;
    }

    const rowDate = row[0];
    const rowTime = row[1];
    const rowQuantity = Number(row[5]);

    if (!rowDate || !rowTime || Number.isNaN(rowQuantity) || rowQuantity <= 0) {
      return false;
    }

    const existingStart = parseDateTime(String(rowDate), String(rowTime));
    const existingEnd = new Date(existingStart.getTime() + reservationDurationMinutes * 60000);

    return existingStart < requestedEnd && existingEnd > requestedStart;
  });

  const occupiedPeople = overlappingReservations.reduce((total, reservationRow) => {
    const quantity = Number(reservationRow[5]);
    return total + (Number.isNaN(quantity) ? 0 : quantity);
  }, 0);

  const availableCapacity = Math.max(onlineMaxCapacity - occupiedPeople, 0);

  return {
    onlineMaxCapacity,
    overlappingReservations,
    occupiedPeople,
    availableCapacity,
    canReserve: occupiedPeople + requestedPeople <= onlineMaxCapacity,
  };
};
