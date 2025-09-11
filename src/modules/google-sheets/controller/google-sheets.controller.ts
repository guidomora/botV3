import { Body, Controller, Get, Post } from '@nestjs/common';
import { GoogleTemporalSheetsService } from '../service/google-temporal-sheet.service';
import { TemporalDataType } from 'src/lib';


@Controller('google-sheets')
export class GoogleSheetsController {
  constructor(private readonly googleSheetsTemporalService: GoogleTemporalSheetsService) {}

  @Post()
  addMissingField(@Body() body: TemporalDataType) {
    return this.googleSheetsTemporalService.addMissingField(body);
  }
}