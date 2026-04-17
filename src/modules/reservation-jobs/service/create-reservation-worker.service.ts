import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { CreateReservationJobData, ServiceResponse } from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import {
  CREATE_RESERVATION_JOB_NAME,
  CREATE_RESERVATION_QUEUE_NAME,
} from '../reservation-jobs.constants';
import { ReservationJobsRedisService } from './reservation-jobs-redis.service';

@Injectable()
export class CreateReservationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CreateReservationWorkerService.name);
  private workerConnection?: IORedis;
  private worker?: Worker<CreateReservationJobData, ServiceResponse>;

  constructor(
    private readonly datesService: DatesService,
    private readonly reservationJobsRedisService: ReservationJobsRedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.reservationJobsRedisService.isEnabled()) {
      return;
    }

    this.workerConnection = this.reservationJobsRedisService.createBullMqConnection();
    this.worker = new Worker<CreateReservationJobData, ServiceResponse>(
      CREATE_RESERVATION_QUEUE_NAME,
      async (job) => {
        if (job.name !== CREATE_RESERVATION_JOB_NAME) {
          throw new Error(`Job no soportado: ${job.name}`);
        }

        return this.datesService.createReservation(job.data.reservation, job.data.options);
      },
      {
        connection: this.workerConnection,
        concurrency: 1,
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Fallo job create-reservation id=${job?.id ?? 'unknown'}: ${error.message}`,
        error.stack,
      );
    });

    await this.worker.waitUntilReady();
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.workerConnection?.quit();
  }
}
