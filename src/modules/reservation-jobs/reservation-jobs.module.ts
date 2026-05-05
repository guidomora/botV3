import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheContextModule } from '../cache-context/cache.module';
import { DatesModule } from '../dates/dates.module';
import twilioConfig from '../whatsapp/twilio.config';
import { whatsappProviders } from '../whatsapp/whatsapp.providers';
import { ClosureNotificationProcessorService } from './service/closure-notification-processor.service';
import { ClosureNotificationOperationService } from './service/closure-notification-operation.service';
import { ClosureNotificationQueueService } from './service/closure-notification-queue.service';
import { ClosureNotificationWorkerService } from './service/closure-notification-worker.service';
import { CreateReservationQueueService } from './service/create-reservation-queue.service';
import { CreateReservationWorkerService } from './service/create-reservation-worker.service';
import { DeleteReservationQueueService } from './service/delete-reservation-queue.service';
import { DeleteReservationWorkerService } from './service/delete-reservation-worker.service';
import { ReservationJobsRedisService } from './service/reservation-jobs-redis.service';
import { UpdateReservationQueueService } from './service/update-reservation-queue.service';
import { UpdateReservationWorkerService } from './service/update-reservation-worker.service';

@Global()
@Module({
  imports: [ConfigModule, ConfigModule.forFeature(twilioConfig), DatesModule, CacheContextModule],
  providers: [
    ReservationJobsRedisService,
    CreateReservationQueueService,
    CreateReservationWorkerService,
    DeleteReservationQueueService,
    DeleteReservationWorkerService,
    UpdateReservationQueueService,
    UpdateReservationWorkerService,
    ClosureNotificationOperationService,
    ClosureNotificationQueueService,
    ClosureNotificationWorkerService,
    ClosureNotificationProcessorService,
    ...whatsappProviders,
  ],
  exports: [
    ReservationJobsRedisService,
    CreateReservationQueueService,
    DeleteReservationQueueService,
    UpdateReservationQueueService,
    ClosureNotificationOperationService,
    ClosureNotificationQueueService,
  ],
})
export class ReservationJobsModule {}
