import { Provider } from '@nestjs/common';
import { DATES_SHEET_PORT, DATES_TEMPORAL_SHEET_PORT } from './dates.tokens';
import { GoogleSheetsDatesSheetAdapter } from './infrastructure/google-sheets-dates-sheet.adapter';
import { GoogleSheetsTemporalAdapter } from './infrastructure/google-sheets-temporal.adapter';

export const datesProviders: Provider[] = [
  GoogleSheetsDatesSheetAdapter,
  GoogleSheetsTemporalAdapter,
  {
    provide: DATES_SHEET_PORT,
    useExisting: GoogleSheetsDatesSheetAdapter,
  },
  {
    provide: DATES_TEMPORAL_SHEET_PORT,
    useExisting: GoogleSheetsTemporalAdapter,
  },
];
