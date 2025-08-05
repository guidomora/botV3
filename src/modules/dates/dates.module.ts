import { Module } from '@nestjs/common';
import { DatesService } from './service/dates.service';
import { DatesController } from './controller/dates.controller';
import { GoogleSheetsModule } from 'src/google-sheets/google-sheets.module';
import { GenerateDatetime } from './dateTime-build/generate-datetime';
import { CreateDayUseCase } from './aplication/create-day.use-case';

@Module({
  controllers: [DatesController],
  imports: [GoogleSheetsModule.forRoot()],
  providers: [ DatesService,
    GenerateDatetime,
    CreateDayUseCase],
  exports:[DatesService]
  })
export class DatesModule {}
