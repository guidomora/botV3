import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ClosureNotificationJobData } from 'src/lib';
import {
  CLOSURE_NOTIFICATION_JOB_NAME,
  CLOSURE_NOTIFICATION_QUEUE_NAME,
} from '../reservation-jobs.constants';
import { ClosureNotificationProcessorService } from './closure-notification-processor.service';
import { ReservationJobsRedisService } from './reservation-jobs-redis.service';

@Injectable()
export class ClosureNotificationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClosureNotificationWorkerService.name);
  private workerConnection?: IORedis;
  private worker?: Worker<ClosureNotificationJobData, void>;

  constructor(
    private readonly processorService: ClosureNotificationProcessorService,
    private readonly reservationJobsRedisService: ReservationJobsRedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.reservationJobsRedisService.isEnabled()) {
      this.logger.log(
        'Closure notification worker deshabilitado porque reservation-jobs no esta activo',
      );
      return;
    }

    this.workerConnection = this.reservationJobsRedisService.createBullMqConnection();
    this.worker = new Worker<ClosureNotificationJobData, void>(
      CLOSURE_NOTIFICATION_QUEUE_NAME,
      async (job) => {
        if (job.name !== CLOSURE_NOTIFICATION_JOB_NAME) {
          throw new Error(`Job no soportado: ${job.name}`);
        }

        this.logger.log(
          `Procesando job closure-notification id=${job.id ?? 'unknown'} phone=${job.data.reservation.phone} date=${job.data.sheetDate} time=${job.data.reservation.time}`,
        );

        await this.processorService.notifyReservation(job.data);
      },
      {
        connection: this.workerConnection,
        concurrency: 1,
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Fallo job closure-notification id=${job?.id ?? 'unknown'}: ${error.message}`,
        error.stack,
      );
    });

    await this.worker.waitUntilReady();
    this.logger.log('Closure notification worker inicializado y escuchando jobs');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.workerConnection?.quit();
    this.logger.log('Closure notification worker cerrado correctamente');
  }
}
