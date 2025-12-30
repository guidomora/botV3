import { Body, Controller, Get, Post } from '@nestjs/common';
import { GoogleTemporalSheetsService } from '../service/google-temporal-sheet.service';
import { AddMissingFieldInput } from 'src/lib';
import { GoogleSheetsService } from '../service/google-sheets.service';


@Controller('google-sheets')
export class GoogleSheetsController {
  constructor(
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleSheetsTemporalService: GoogleTemporalSheetsService) {}

  @Post()
  addMissingField(@Body() body:AddMissingFieldInput) {
    return this.googleSheetsTemporalService.addMissingField(body);
  }

  @Get()
  getDayAvailability(@Body('date') body:string) {
    return this.googleSheetsService.getDayAvailability(body);
  }

  @Get('/test')
  updateReservation() {
    return this.googleSheetsService.updateReservationByDate(
      'lunes 29 de diciembre 2025 29/12/2025', 'martes 30 de diciembre 2025 30/12/2025',
    '21:00', '21:00');
  }
}