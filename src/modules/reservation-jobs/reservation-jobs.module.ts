import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatesModule } from '../dates/dates.module';
import { CreateReservationQueueService } from './service/create-reservation-queue.service';
import { CreateReservationWorkerService } from './service/create-reservation-worker.service';
import { ReservationJobsRedisService } from './service/reservation-jobs-redis.service';

@Global()
@Module({
  imports: [ConfigModule, DatesModule],
  providers: [
    ReservationJobsRedisService,
    CreateReservationQueueService,
    CreateReservationWorkerService,
  ],
  exports: [ReservationJobsRedisService, CreateReservationQueueService],
})
export class ReservationJobsModule {}
