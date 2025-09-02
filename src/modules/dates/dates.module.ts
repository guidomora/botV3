import { Module } from '@nestjs/common';
import { DatesService } from './service/dates.service';
import { DatesController } from './controller/dates.controller';
import { GoogleSheetsModule } from 'src/google-sheets/google-sheets.module';
import { GenerateDatetime } from './dateTime-build/generate-datetime';
import { CreateDayUseCase, CreateReservationRowUseCase, DeleteReservationUseCase } from './application';

@Module({
  controllers: [DatesController],
  imports: [GoogleSheetsModule.forRoot()],
  providers: [ DatesService,
    GenerateDatetime,
    CreateDayUseCase,
    CreateReservationRowUseCase,
    DeleteReservationUseCase],
  exports:[DatesService]
  })
export class DatesModule {}
