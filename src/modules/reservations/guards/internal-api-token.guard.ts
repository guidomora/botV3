import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INTERNAL_API_TOKEN_HEADER } from 'src/constants';

@Injectable()
export class InternalApiTokenGuard implements CanActivate {
  private readonly logger = new Logger(InternalApiTokenGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedToken = this.configService.get<string>('INTERNAL_API_TOKEN');

    if (!expectedToken) {
      this.logger.error('Reservations rechazado: INTERNAL_API_TOKEN no configurado');
      throw new ForbiddenException('Internal API token is not configured');
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const providedToken = this.extractFirstHeaderValue(request.headers[INTERNAL_API_TOKEN_HEADER]);

    if (!providedToken || providedToken !== expectedToken) {
      this.logger.warn('Reservations rechazado: token interno invalido o ausente');
      throw new ForbiddenException('Invalid internal API token');
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
