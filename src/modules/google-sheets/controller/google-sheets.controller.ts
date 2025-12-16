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
}