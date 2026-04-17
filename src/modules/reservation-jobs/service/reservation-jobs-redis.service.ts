import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientOptions } from 'redis';
import { ReservationJobsRedisConfig } from 'src/lib';

@Injectable()
export class ReservationJobsRedisService {
  private readonly logger = new Logger(ReservationJobsRedisService.name);
  private readonly healthcheckTimeoutMs = 2000;

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return this.getConfig().enabled;
  }

  getConfig(): ReservationJobsRedisConfig {
    return {
      enabled: this.configService.get<boolean>('RESERVATION_JOBS_ENABLED') ?? false,
      url: this.configService.get<string>('REDIS_URL'),
      host:
        this.configService.get<string>('REDIS_HOST') ?? this.configService.get<string>('REDISHOST'),
      port:
        this.configService.get<number>('REDIS_PORT') ??
        this.configService.get<number>('REDISPORT') ??
        6379,
      username:
        this.configService.get<string>('REDIS_USERNAME') ??
        this.configService.get<string>('REDISUSER'),
      password:
        this.configService.get<string>('REDIS_PASSWORD') ??
        this.configService.get<string>('REDISPASSWORD'),
      db: this.configService.get<number>('REDIS_DB') ?? 0,
      tlsEnabled: this.configService.get<boolean>('REDIS_TLS_ENABLED') ?? false,
    };
  }

  async getReadinessStatus(): Promise<'ok' | 'error' | 'disabled'> {
    if (!this.isEnabled()) {
      return 'disabled';
    }

    const client = createClient(this.buildClientOptions());

    try {
      await this.withTimeout(client.connect());
      const response = await this.withTimeout(client.ping());

      return response === 'PONG' ? 'ok' : 'error';
    } catch (error) {
      this.logger.warn(`No se pudo validar Redis para reservation-jobs: ${String(error)}`);
      return 'error';
    } finally {
      if (client.isOpen) {
        await client.quit().catch(() => {
          void client.disconnect();
        });
      }
    }
  }

  private buildClientOptions(): RedisClientOptions {
    const config = this.getConfig();

    if (config.url) {
      return {
        url: config.url,
      };
    }

    const socket = config.tlsEnabled
      ? {
          host: config.host,
          port: config.port,
          tls: true as const,
        }
      : {
          host: config.host,
          port: config.port,
        };

    return {
      socket,
      username: config.username,
      password: config.password,
      database: config.db,
    };
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Redis healthcheck timeout'));
        }, this.healthcheckTimeoutMs);
      }),
    ]).finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    });
  }
}
