import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import {
  ClosureNotificationJobData,
  ClosureNotificationQueueResult,
  ClosureNotificationRequest,
} from 'src/lib';
import {
  CLOSURE_NOTIFICATION_JOB_NAME,
  CLOSURE_NOTIFICATION_QUEUE_NAME,
} from '../reservation-jobs.constants';
import { ClosureNotificationOperationService } from './closure-notification-operation.service';
import { ClosureNotificationProcessorService } from './closure-notification-processor.service';
import { ReservationJobsRedisService } from './reservation-jobs-redis.service';

@Injectable()
export class ClosureNotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClosureNotificationQueueService.name);
  private producerConnection?: IORedis;
  private queue?: Queue<ClosureNotificationJobData, void>;

  constructor(
    private readonly processorService: ClosureNotificationProcessorService,
    private readonly operationService: ClosureNotificationOperationService,
    private readonly reservationJobsRedisService: ReservationJobsRedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.reservationJobsRedisService.isEnabled()) {
      this.logger.log(
        'reservation-jobs deshabilitado; closure notifications usaran ejecucion directa',
      );
      return;
    }

    this.producerConnection = this.reservationJobsRedisService.createBullMqConnection();
    this.queue = new Queue<ClosureNotificationJobData, void>(CLOSURE_NOTIFICATION_QUEUE_NAME, {
      connection: this.producerConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });

    await this.queue.waitUntilReady();
    this.logger.log('Closure notification queue inicializada y lista para recibir jobs');
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
    await this.producerConnection?.quit();
    this.logger.log('Closure notification queue cerrada correctamente');
  }

  async notifyClosure(
    request: ClosureNotificationRequest,
  ): Promise<ClosureNotificationQueueResult> {
    const operation =
      request.reservations.length > 0
        ? await this.operationService.createOperation(request.reservations.length)
        : null;
    const jobs = request.reservations.map((reservation) => ({
      operationId: operation?.operationId ?? null,
      closureType: request.closureType,
      date: request.date,
      sheetDate: request.sheetDate,
      fromTime: request.fromTime,
      toTime: request.toTime,
      reason: request.reason ?? null,
      reservation,
    }));

    if (jobs.length === 0) {
      return { queuedCount: 0, closureOperationId: null };
    }

    if (!this.reservationJobsRedisService.isEnabled()) {
      for (const job of jobs) {
        try {
          await this.processorService.notifyReservation(job);
          await this.operationService.markNotificationSent(job.operationId);
        } catch {
          await this.operationService.markNotificationFailed(job.operationId, {
            name: job.reservation.name,
            phone: job.reservation.phone.replace(/\D+/g, ''),
            date: job.reservation.date,
            time: job.reservation.time,
          });
        }
      }

      return { queuedCount: jobs.length, closureOperationId: operation?.operationId ?? null };
    }

    if (!this.queue) {
      throw new Error('La cola de closure notifications no esta inicializada');
    }

    await this.queue.addBulk(
      jobs.map((data) => ({
        name: CLOSURE_NOTIFICATION_JOB_NAME,
        data,
      })),
    );

    this.logger.log(
      `Jobs closure-notification encolados count=${jobs.length} date=${request.date}`,
    );

    return { queuedCount: jobs.length, closureOperationId: operation?.operationId ?? null };
  }
}
