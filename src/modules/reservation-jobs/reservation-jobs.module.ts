import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatesModule } from '../dates/dates.module';
import { CreateReservationQueueService } from './service/create-reservation-queue.service';
import { CreateReservationWorkerService } from './service/create-reservation-worker.service';
import { DeleteReservationQueueService } from './service/delete-reservation-queue.service';
import { DeleteReservationWorkerService } from './service/delete-reservation-worker.service';
import { ReservationJobsRedisService } from './service/reservation-jobs-redis.service';
import { UpdateReservationQueueService } from './service/update-reservation-queue.service';
import { UpdateReservationWorkerService } from './service/update-reservation-worker.service';

@Global()
@Module({
  imports: [ConfigModule, DatesModule],
  providers: [
    ReservationJobsRedisService,
    CreateReservationQueueService,
    CreateReservationWorkerService,
    DeleteReservationQueueService,
    DeleteReservationWorkerService,
    UpdateReservationQueueService,
    UpdateReservationWorkerService,
  ],
  exports: [
    ReservationJobsRedisService,
    CreateReservationQueueService,
    DeleteReservationQueueService,
    UpdateReservationQueueService,
  ],
})
export class ReservationJobsModule {}
