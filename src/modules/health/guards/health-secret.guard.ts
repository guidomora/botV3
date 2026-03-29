import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HEALTH_CHECK_SECRET_HEADER } from 'src/constants';

@Injectable()
export class HealthSecretGuard implements CanActivate {
  private readonly logger = new Logger(HealthSecretGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = this.configService.get<string>('HEALTH_CHECK_SECRET');

    if (!expectedSecret) {
      this.logger.error('Health check rechazado: HEALTH_CHECK_SECRET no configurado');
      throw new ForbiddenException('Health check is not configured');
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const providedSecret = this.extractFirstHeaderValue(
      request.headers[HEALTH_CHECK_SECRET_HEADER],
    );

    if (!providedSecret || providedSecret !== expectedSecret) {
      this.logger.warn('Health check rechazado: secret inválido o ausente');
      throw new ForbiddenException('Invalid health check secret');
    }

    return true;
  }

  private extractFirstHeaderValue(headerValue: string | string[] | undefined): string | undefined {
    if (!headerValue) {
      return undefined;
    }

    if (Array.isArray(headerValue)) {
      return headerValue[0]?.trim();
    }

    return headerValue.trim();
  }
}
