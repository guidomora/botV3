import { ROW_ORDER, REQUIRED_SLOTS } from 'src/constants/tables-info/temporal-data-rows';
import { TemporalStatusEnum } from 'src/lib';

export function objectToRowArray(obj: any): any[] {
  return ROW_ORDER.map((k) => obj[k] ?? ' ');
}

export function computeStatus(obj: any) {
  const missing = REQUIRED_SLOTS.filter((k) => {
    const v = (obj[k] ?? '').toString().trim();
    return !v || v === ' ';
  });

  const status =
    missing.length === 0
      ? TemporalStatusEnum.COMPLETED
      : missing.length === REQUIRED_SLOTS.length
        ? TemporalStatusEnum.NO_DATA
        : TemporalStatusEnum.IN_PROGRESS;

  return { status, missingFields: missing };
}

export function buildEmptyRow(waId: string): string[] {
  const obj = {
    date: ' ',
    time: ' ',
    name: ' ',
    phone: ' ',
    service: 'Food',
    quantity: ' ',
    waId,
    status: TemporalStatusEnum.NO_DATA,
    intent: 'create',
  };
  return objectToRowArray(obj);
}
