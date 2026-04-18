import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import {
  ServiceResponse,
  UpdateReservationJobData,
  UpdateReservationOptions,
  UpdateReservationType,
} from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import {
  UPDATE_RESERVATION_JOB_NAME,
  UPDATE_RESERVATION_QUEUE_NAME,
} from '../reservation-jobs.constants';
import { ReservationJobsRedisService } from './reservation-jobs-redis.service';

@Injectable()
export class UpdateReservationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UpdateReservationQueueService.name);
  private readonly jobTimeoutMs = 15000;
  private producerConnection?: IORedis;
  private eventsConnection?: IORedis;
  private queue?: Queue<UpdateReservationJobData, ServiceResponse>;
  private queueEvents?: QueueEvents;

  constructor(
    private readonly datesService: DatesService,
    private readonly reservationJobsRedisService: ReservationJobsRedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.reservationJobsRedisService.isEnabled()) {
      this.logger.log('reservation-jobs deshabilitado; update reservation usara ejecucion directa');
      return;
    }

    this.producerConnection = this.reservationJobsRedisService.createBullMqConnection();
    this.eventsConnection = this.reservationJobsRedisService.createBullMqConnection();
    this.queue = new Queue<UpdateReservationJobData, ServiceResponse>(
      UPDATE_RESERVATION_QUEUE_NAME,
      {
        connection: this.producerConnection,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      },
    );
    this.queueEvents = new QueueEvents(UPDATE_RESERVATION_QUEUE_NAME, {
      connection: this.eventsConnection,
    });

    await this.queue.waitUntilReady();
    await this.queueEvents.waitUntilReady();
    this.logger.log('Update reservation queue inicializada y lista para recibir jobs');
  }

  async onModuleDestroy(): Promise<void> {
    await this.queueEvents?.close();
    await this.queue?.close();
    await this.eventsConnection?.quit();
    await this.producerConnection?.quit();
    this.logger.log('Update reservation queue cerrada correctamente');
  }

  async updateReservation(
    reservation: UpdateReservationType,
    options?: UpdateReservationOptions,
  ): Promise<ServiceResponse> {
    if (!this.reservationJobsRedisService.isEnabled()) {
      return this.datesService.updateReservation(reservation, options);
    }

    if (!this.queue || !this.queueEvents) {
      throw new Error('La cola de update reservation no esta inicializada');
    }

    const job = await this.queue.add(UPDATE_RESERVATION_JOB_NAME, {
      reservation,
      options,
    });
    this.logger.log(
      `Job update-reservation encolado id=${job.id ?? 'unknown'} phone=${reservation.phone} currentDate=${reservation.currentDate} currentTime=${reservation.currentTime}`,
    );

    const result = await job.waitUntilFinished(this.queueEvents, this.jobTimeoutMs);
    this.logger.log(
      `Job update-reservation finalizado id=${job.id ?? 'unknown'} status=${result.status} error=${result.error}`,
    );

    return result;
  }
}
