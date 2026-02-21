import { ROW_ORDER, REQUIRED_SLOTS } from 'src/constants/tables-info/temporal-data-rows';
import { TemporalDataType, TemporalStatusEnum } from 'src/lib';

type TemporalRowData = TemporalDataType & { status?: TemporalStatusEnum };

export function objectToRowArray(obj: TemporalRowData): string[] {
  return ROW_ORDER.map((k) => {
    const value = obj[k as keyof TemporalRowData];
    return value !== undefined && value !== null ? String(value) : ' ';
  });
}

export function computeStatus(obj: TemporalDataType) {
  const missing = REQUIRED_SLOTS.filter((k) => {
    const value = obj[k];
    const normalized = value ? value.toString().trim() : '';
    return !normalized || normalized === ' ';
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
  const obj: TemporalRowData = {
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
