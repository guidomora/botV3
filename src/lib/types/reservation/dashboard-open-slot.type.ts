export interface DashboardOpenSlotType {
  date: string;
  fromTime: string;
  toTime: string;
}

export interface DashboardOpenSlotResult {
  date: string;
  fromTime: string;
  toTime: string;
  isClosed: false;
  reopenedSlotsCount: number;
}
