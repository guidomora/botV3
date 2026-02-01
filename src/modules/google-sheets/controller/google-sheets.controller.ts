import { Controller } from '@nestjs/common';
import { GoogleTemporalSheetsService } from '../service/google-temporal-sheet.service';
import { GoogleSheetsService } from '../service/google-sheets.service';


@Controller('google-sheets')
export class GoogleSheetsController {
  constructor(
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleSheetsTemporalService: GoogleTemporalSheetsService) {}

}