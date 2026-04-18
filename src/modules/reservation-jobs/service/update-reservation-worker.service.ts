import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ServiceResponse, UpdateReservationJobData } from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import {
  UPDATE_RESERVATION_JOB_NAME,
  UPDATE_RESERVATION_QUEUE_NAME,
} from '../reservation-jobs.constants';
import { ReservationJobsRedisService } from './reservation-jobs-redis.service';

@Injectable()
export class UpdateReservationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UpdateReservationWorkerService.name);
  private workerConnection?: IORedis;
  private worker?: Worker<UpdateReservationJobData, ServiceResponse>;

  constructor(
    private readonly datesService: DatesService,
    private readonly reservationJobsRedisService: ReservationJobsRedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.reservationJobsRedisService.isEnabled()) {
      this.logger.log(
        'Update reservation worker deshabilitado porque reservation-jobs no esta activo',
      );
      return;
    }

    this.workerConnection = this.reservationJobsRedisService.createBullMqConnection();
    this.worker = new Worker<UpdateReservationJobData, ServiceResponse>(
      UPDATE_RESERVATION_QUEUE_NAME,
      async (job) => {
        if (job.name !== UPDATE_RESERVATION_JOB_NAME) {
          throw new Error(`Job no soportado: ${job.name}`);
        }

        this.logger.log(
          `Procesando job update-reservation id=${job.id ?? 'unknown'} phone=${job.data.reservation.phone} currentDate=${job.data.reservation.currentDate} currentTime=${job.data.reservation.currentTime}`,
        );

        const result = await this.datesService.updateReservation(
          job.data.reservation,
          job.data.options,
        );

        this.logger.log(
          `Job update-reservation procesado id=${job.id ?? 'unknown'} status=${result.status} error=${result.error}`,
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
        `Fallo job update-reservation id=${job?.id ?? 'unknown'}: ${error.message}`,
        error.stack,
      );
    });

    await this.worker.waitUntilReady();
    this.logger.log('Update reservation worker inicializado y escuchando jobs');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.workerConnection?.quit();
    this.logger.log('Update reservation worker cerrado correctamente');
  }
}
