import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { DeleteReservation, DeleteReservationJobData } from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import {
  DELETE_RESERVATION_JOB_NAME,
  DELETE_RESERVATION_QUEUE_NAME,
} from '../reservation-jobs.constants';
import { ReservationJobsRedisService } from './reservation-jobs-redis.service';

@Injectable()
export class DeleteReservationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeleteReservationQueueService.name);
  private readonly jobTimeoutMs = 15000;
  private producerConnection?: IORedis;
  private eventsConnection?: IORedis;
  private queue?: Queue<DeleteReservationJobData, string>;
  private queueEvents?: QueueEvents;

  constructor(
    private readonly datesService: DatesService,
    private readonly reservationJobsRedisService: ReservationJobsRedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.reservationJobsRedisService.isEnabled()) {
      this.logger.log('reservation-jobs deshabilitado; delete reservation usara ejecucion directa');
      return;
    }

    this.producerConnection = this.reservationJobsRedisService.createBullMqConnection();
    this.eventsConnection = this.reservationJobsRedisService.createBullMqConnection();
    this.queue = new Queue<DeleteReservationJobData, string>(DELETE_RESERVATION_QUEUE_NAME, {
      connection: this.producerConnection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
    this.queueEvents = new QueueEvents(DELETE_RESERVATION_QUEUE_NAME, {
      connection: this.eventsConnection,
    });

    await this.queue.waitUntilReady();
    await this.queueEvents.waitUntilReady();
    this.logger.log('Delete reservation queue inicializada y lista para recibir jobs');
  }

  async onModuleDestroy(): Promise<void> {
    await this.queueEvents?.close();
    await this.queue?.close();
    await this.eventsConnection?.quit();
    await this.producerConnection?.quit();
    this.logger.log('Delete reservation queue cerrada correctamente');
  }

  async deleteReservation(reservation: DeleteReservation): Promise<string> {
    if (!this.reservationJobsRedisService.isEnabled()) {
      return this.datesService.deleteReservation(reservation);
    }

    if (!this.queue || !this.queueEvents) {
      throw new Error('La cola de delete reservation no esta inicializada');
    }

    const job = await this.queue.add(DELETE_RESERVATION_JOB_NAME, {
      reservation,
    });
    this.logger.log(
      `Job delete-reservation encolado id=${job.id ?? 'unknown'} phone=${reservation.phone} date=${reservation.date} time=${reservation.time}`,
    );

    const result = await job.waitUntilFinished(this.queueEvents, this.jobTimeoutMs);
    this.logger.log(`Job delete-reservation finalizado id=${job.id ?? 'unknown'} result=${result}`);

    return result;
  }
}
