import { TemporalDataRows } from 'src/constants/tables-info/temporal-data-rows';
import {
  AddMissingFieldInput,
  TemporalCleanupCandidate,
  TemporalDataType,
} from 'src/lib/types/google-sheet';

export interface DatesTemporalSheetPort {
  addMissingField(input: AddMissingFieldInput): Promise<TemporalDataRows>;
  findTemporalRowIndexByWaId(waId: string): Promise<number>;
  findExpiredRows(cutoffIso: string): Promise<TemporalCleanupCandidate[]>;
  clearFields(waId: string, fields: (keyof TemporalDataType)[]): Promise<TemporalDataRows>;
}
