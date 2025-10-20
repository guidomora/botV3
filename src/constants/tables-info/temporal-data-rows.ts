import { TemporalDataType } from "src/lib";

export const COL_MAP = {
    date: 'A',
    time: 'B',
    name: 'C',
    phone: 'D',
    service: 'E',
    quantity: 'F',
    waId: 'G',
    status: 'H',
    intent: 'I',
  } as const;

  export type ColumnKey = keyof typeof COL_MAP;

  export const ROW_ORDER: ColumnKey[] = [
    'date',
    'time',
    'name',
    'phone',
    'service',
    'quantity',
    'waId',
    'status',
    'intent',
  ];


  export const REQUIRED_SLOTS: (keyof TemporalDataType)[] = [
    'date',
    'time',
    'name',
    'phone',
    'service',
    'quantity',
    'intent',
  ];