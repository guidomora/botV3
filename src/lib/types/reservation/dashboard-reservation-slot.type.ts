export type DashboardReservationSlot = {
  time: string;
  reserved: number;
  available: number;
  isClosed: boolean;
  reason: string | null;
};
