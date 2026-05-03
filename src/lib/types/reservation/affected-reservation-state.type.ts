export type ClosureType = 'day' | 'slot';

export type AffectedReservationState = {
  name: string;
  phone: string;
  date: string;
  time: string;
  quantity: number;
  closureType: ClosureType;
  closureReason: string | null;
  notifiedAt: number;
};
