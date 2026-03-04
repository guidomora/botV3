import { DateTime } from 'src/lib/types/datetime/datetime.type';

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
