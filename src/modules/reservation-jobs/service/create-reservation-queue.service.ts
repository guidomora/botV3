import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import {
  CreateReservationJobData,
  CreateReservationOptions,
  CreateReservationType,
  ServiceResponse,
} from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import {
  CREATE_RESERVATION_JOB_NAME,
  CREATE_RESERVATION_QUEUE_NAME,
} from '../reservation-jobs.constants';
import { CreateReservationQueueError } from '../errors/create-reservation-queue.error';
import { ReservationJobsRedisService } from './reservation-jobs-redis.service';

@Injectable()
export class CreateReservationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CreateReservationQueueService.name);
  private readonly jobTimeoutMs = 15000;
  private producerConnection?: IORedis;
  private eventsConnection?: IORedis;
  private queue?: Queue<CreateReservationJobData, ServiceResponse>;
  private queueEvents?: QueueEvents;

  constructor(
    private readonly datesService: DatesService,
    private readonly reservationJobsRedisService: ReservationJobsRedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.reservationJobsRedisService.isEnabled()) {
      this.logger.log('reservation-jobs deshabilitado; create reservation usara ejecucion directa');
      return;
    }

    this.producerConnection = this.reservationJobsRedisService.createBullMqConnection();
    this.eventsConnection = this.reservationJobsRedisService.createBullMqConnection();
    this.queue = new Queue<CreateReservationJobData, ServiceResponse>(
      CREATE_RESERVATION_QUEUE_NAME,
      {
        connection: this.producerConnection,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      },
    );
    this.queueEvents = new QueueEvents(CREATE_RESERVATION_QUEUE_NAME, {
      connection: this.eventsConnection,
    });

    await this.queue.waitUntilReady();
    await this.queueEvents.waitUntilReady();
    this.logger.log('Create reservation queue inicializada y lista para recibir jobs');
  }

  async onModuleDestroy(): Promise<void> {
    await this.queueEvents?.close();
    await this.queue?.close();
    await this.eventsConnection?.quit();
    await this.producerConnection?.quit();
    this.logger.log('Create reservation queue cerrada correctamente');
  }

  async createReservation(
    reservation: CreateReservationType,
    options?: CreateReservationOptions,
  ): Promise<ServiceResponse> {
    if (!this.reservationJobsRedisService.isEnabled()) {
      try {
        return await this.datesService.createReservation(reservation, options);
      } catch (error) {
        throw CreateReservationQueueError.from(error, false);
      }
    }

    if (!this.queue || !this.queueEvents) {
      throw new CreateReservationQueueError(
        'La cola de create reservation no esta inicializada',
        false,
      );
    }

    let job: Job<CreateReservationJobData, ServiceResponse>;

    try {
      job = await this.queue.add(CREATE_RESERVATION_JOB_NAME, {
        reservation,
        options,
      });
    } catch (error) {
      throw CreateReservationQueueError.from(error, false);
    }

    this.logger.log(
      `Job create-reservation encolado id=${job.id ?? 'unknown'} phone=${reservation.phone} date=${reservation.date} time=${reservation.time}`,
    );

    let result: ServiceResponse;

    try {
      result = await job.waitUntilFinished(this.queueEvents, this.jobTimeoutMs);
    } catch (error) {
      throw CreateReservationQueueError.from(error, true);
    }

    this.logger.log(
      `Job create-reservation finalizado id=${job.id ?? 'unknown'} status=${result.status} error=${result.error}`,
    );

    return result;
  }
}
