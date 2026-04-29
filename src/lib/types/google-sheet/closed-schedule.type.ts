export type ClosedDayEntry = {
  rowIndex: number;
  date: string;
  reason: string | null;
  createdAt: string | null;
};

export type ClosedSlotEntry = {
  rowIndex?: number;
  date: string;
  fromTime: string;
  toTime: string;
  reason: string | null;
  createdAt: string | null;
};

export type NormalizedClosedSlotEntry = {
  date: string;
  fromTime: string;
  toTime: string;
  reason: string | null;
  createdAt: string;
};

export type ClosedSlotSummary = {
  fromTime: string;
  toTime: string;
  reason: string | null;
};
