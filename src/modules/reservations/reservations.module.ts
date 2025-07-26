import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { GoogleSheetsModule } from 'src/shared/google-sheets.module';

@Module({
  imports: [GoogleSheetsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
