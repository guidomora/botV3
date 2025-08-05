import { Module } from '@nestjs/common';
import { ReservationsService } from './service/reservations.service';
import { ReservationsController } from './controller/reservations.controller';
import { DatesModule } from 'src/modules/dates/dates.module';

@Module({
  imports: [DatesModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
