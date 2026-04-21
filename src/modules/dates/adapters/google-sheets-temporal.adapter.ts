import { Injectable } from '@nestjs/common';
import { TemporalDataRows } from 'src/constants/tables-info/temporal-data-rows';
import {
  AddMissingFieldInput,
  TemporalCleanupCandidate,
  TemporalDataType,
} from 'src/lib/types/google-sheet';
import { GoogleTemporalSheetsService } from 'src/modules/google-sheets/service/google-temporal-sheet.service';
import { DatesTemporalSheetPort } from '../ports';

@Injectable()
export class GoogleSheetsTemporalAdapter implements DatesTemporalSheetPort {
  constructor(private readonly googleTemporalSheetsService: GoogleTemporalSheetsService) {}

  addMissingField(input: AddMissingFieldInput): Promise<TemporalDataRows> {
    return this.googleTemporalSheetsService.addMissingField(input);
  }

  findTemporalRowIndexByWaId(waId: string): Promise<number> {
    return this.googleTemporalSheetsService.findTemporalRowIndexByWaId(waId);
  }

  findExpiredRows(cutoffIso: string): Promise<TemporalCleanupCandidate[]> {
    return this.googleTemporalSheetsService.findExpiredRows(cutoffIso);
  }

  clearFields(waId: string, fields: (keyof TemporalDataType)[]): Promise<TemporalDataRows> {
    return this.googleTemporalSheetsService.clearFields(waId, fields);
  }
}
