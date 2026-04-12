import { DateTime } from 'src/lib/types/datetime/datetime.type';

export interface CapacityWindowInput {
  date: string;
  time: string;
  requestedPeople: number;
  reservationDurationMinutes: number;
  slotIntervalMinutes: number;
  onlineMaxCapacity: number;
  availableSlotTimes: string[];
  existingReservations: DateTime;
  excludedRowIndex?: number;
}

export interface CapacityWindowResult {
  onlineMaxCapacity: number;
  affectedSlotTimes: string[];
  occupiedPeople: number;
  availableCapacity: number;
  canReserve: boolean;
}
