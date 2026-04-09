import { TemporalDataRows } from 'src/constants/tables-info/temporal-data-rows';
import { AddMissingFieldInput, TemporalDataType } from 'src/lib/types/google-sheet';

export interface DatesTemporalSheetPort {
  addMissingField(input: AddMissingFieldInput): Promise<TemporalDataRows>;
  findTemporalRowIndexByWaId(waId: string): Promise<number>;
  clearFields(waId: string, fields: (keyof TemporalDataType)[]): Promise<TemporalDataRows>;
}
