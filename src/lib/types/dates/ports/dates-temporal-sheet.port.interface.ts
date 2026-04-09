import { AddMissingFieldInput, TemporalDataType } from '../../google-sheet';
import { TemporalDataRows } from 'src/constants/tables-info/temporal-data-rows';

export interface DatesTemporalSheetPort {
  addMissingField(input: AddMissingFieldInput): Promise<TemporalDataRows>;
  findTemporalRowIndexByWaId(waId: string): Promise<number>;
  clearFields(waId: string, fields: (keyof TemporalDataType)[]): Promise<TemporalDataRows>;
}
