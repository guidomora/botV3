import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { DeleteReservationJobData } from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import {
  DELETE_RESERVATION_JOB_NAME,
  DELETE_RESERVATION_QUEUE_NAME,
} from '../reservation-jobs.constants';
import { ReservationJobsRedisService } from './reservation-jobs-redis.service';

@Injectable()
export class DeleteReservationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeleteReservationWorkerService.name);
  private workerConnection?: IORedis;
  private worker?: Worker<DeleteReservationJobData, string>;

  constructor(
    private readonly datesService: DatesService,
    private readonly reservationJobsRedisService: ReservationJobsRedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.reservationJobsRedisService.isEnabled()) {
      this.logger.log(
        'Delete reservation worker deshabilitado porque reservation-jobs no esta activo',
      );
      return;
    }

    this.workerConnection = this.reservationJobsRedisService.createBullMqConnection();
    this.worker = new Worker<DeleteReservationJobData, string>(
      DELETE_RESERVATION_QUEUE_NAME,
      async (job) => {
        if (job.name !== DELETE_RESERVATION_JOB_NAME) {
          throw new Error(`Job no soportado: ${job.name}`);
        }

        this.logger.log(
          `Procesando job delete-reservation id=${job.id ?? 'unknown'} phone=${job.data.reservation.phone} date=${job.data.reservation.date} time=${job.data.reservation.time}`,
        );

        const result = await this.datesService.deleteReservation(job.data.reservation);

        this.logger.log(
          `Job delete-reservation procesado id=${job.id ?? 'unknown'} result=${result}`,
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
        `Fallo job delete-reservation id=${job?.id ?? 'unknown'}: ${error.message}`,
        error.stack,
      );
    });

    await this.worker.waitUntilReady();
    this.logger.log('Delete reservation worker inicializado y escuchando jobs');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.workerConnection?.quit();
    this.logger.log('Delete reservation worker cerrado correctamente');
  }
}
