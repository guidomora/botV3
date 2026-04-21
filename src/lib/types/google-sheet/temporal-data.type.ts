import { StatusEnum } from '../method-responses';

export interface TemporalDataType {
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
  service?: string;
  quantity?: string;
  waId?: string;
  intent?: string;
  updatedAt?: string;
}

export enum TemporalStatusEnum {
  NO_DATA = 'NO_DATA',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export type AddMissingFieldInput = {
  waId: string;
  values: TemporalDataType;
  messageSid?: string;
};

export type AddMissingFieldOutput = {
  status: TemporalStatusEnum;
  rowIndex?: number;
  missingFields: string[];
  reservationData: TemporalDataType;
  message?: string;
  errorStatus?: StatusEnum;
};

export interface TemporalCleanupCandidate {
  rowIndex: number;
  waId: string;
  status: TemporalStatusEnum;
  updatedAt: string;
}
