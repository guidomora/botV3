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
      this.logger.log(
        'Create reservation worker deshabilitado porque reservation-jobs no esta activo',
      );
      return;
    }

    this.workerConnection = this.reservationJobsRedisService.createBullMqConnection();
    this.worker = new Worker<CreateReservationJobData, ServiceResponse>(
      CREATE_RESERVATION_QUEUE_NAME,
      async (job) => {
        if (job.name !== CREATE_RESERVATION_JOB_NAME) {
          throw new Error(`Job no soportado: ${job.name}`);
        }

        this.logger.log(
          `Procesando job create-reservation id=${job.id ?? 'unknown'} phone=${job.data.reservation.phone} date=${job.data.reservation.date} time=${job.data.reservation.time}`,
        );

        const result = await this.datesService.createReservation(
          job.data.reservation,
          job.data.options,
        );

        this.logger.log(
          `Job create-reservation procesado id=${job.id ?? 'unknown'} status=${result.status} error=${result.error}`,
        );

        return result;
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
    this.logger.log('Create reservation worker inicializado y escuchando jobs');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.workerConnection?.quit();
    this.logger.log('Create reservation worker cerrado correctamente');
  }
}
