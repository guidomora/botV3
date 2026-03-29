import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(HealthRateLimitGuard.name);
  private readonly windowMs = 60_000;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      ip?: string;
      originalUrl?: string;
      headers: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
    }>();

    const clientIp = this.resolveClientIp(request);
    const maxRequests =
      this.configService.get<number>('HEALTH_CHECK_RATE_LIMIT_MAX_REQUESTS') ?? 15;
    const now = Date.now();
    const cacheKey = `health-rate-limit:${clientIp}`;
    const requestHistory = (await this.cacheManager.get<number[]>(cacheKey)) ?? [];
    const prunedHistory = requestHistory.filter((timestamp) => now - timestamp <= this.windowMs);

    if (prunedHistory.length >= maxRequests) {
      this.logger.warn(
        `Health check rate limit excedido para ${clientIp} en ${request.originalUrl ?? 'unknown-path'}`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many health check requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    prunedHistory.push(now);
    await this.cacheManager.set(cacheKey, prunedHistory, this.windowMs);

    return true;
  }

  private resolveClientIp(request: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
  }): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    const firstForwardedIp = this.extractFirstHeaderValue(forwardedFor);

    return firstForwardedIp ?? request.ip ?? request.socket?.remoteAddress ?? 'unknown';
  }

  private extractFirstHeaderValue(headerValue: string | string[] | undefined): string | undefined {
    if (!headerValue) {
      return undefined;
    }

    if (Array.isArray(headerValue)) {
      return headerValue[0]?.split(',')[0]?.trim();
    }

    return headerValue.split(',')[0]?.trim();
  }
}
