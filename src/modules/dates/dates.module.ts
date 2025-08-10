import { Module } from '@nestjs/common';
import { DatesService } from './service/dates.service';
import { DatesController } from './controller/dates.controller';
import { GoogleSheetsModule } from 'src/google-sheets/google-sheets.module';
import { GenerateDatetime } from './dateTime-build/generate-datetime';
import { CreateDayUseCase } from './application/create-day.use-case';
import { CreateReservationRowUseCase } from './application/create-reservation-row.use-case';

@Module({
  controllers: [DatesController],
  imports: [GoogleSheetsModule.forRoot()],
  providers: [ DatesService,
    GenerateDatetime,
    CreateDayUseCase,
    CreateReservationRowUseCase],
  exports:[DatesService]
  })
export class DatesModule {}
