import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';

@Injectable()
export class AgendaSyncGuard implements CanActivate {
  private readonly logger = new Logger(AgendaSyncGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const expectedSecret = process.env.AGENDA_SYNC_SECRET;

    if (!expectedSecret) {
      this.logger.warn('Endpoint de sincronizacion rechazado: AGENDA_SYNC_SECRET no configurado');
      throw new ForbiddenException('Agenda sync is not configured');
    }

    const receivedSecret = this.extractFirstHeaderValue(request.headers['x-cron-secret']);

    if (!receivedSecret || receivedSecret !== expectedSecret) {
      this.logger.warn('Endpoint de sincronizacion rechazado: secreto invalido');
      throw new ForbiddenException('Invalid agenda sync secret');
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
