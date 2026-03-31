import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AGENDA_SYNC_SIGNATURE_HEADER, AGENDA_SYNC_TIMESTAMP_HEADER } from 'src/constants';
import { AgendaSyncRequest } from 'src/lib';
import { AgendaSyncRateLimitService } from '../service/agenda-sync-rate-limit.service';
import { AgendaSyncReplayService } from '../service/agenda-sync-replay.service';
import { AgendaSyncSecurityService } from '../service/agenda-sync-security.service';

@Injectable()
export class AgendaSyncGuard implements CanActivate {
  private readonly logger = new Logger(AgendaSyncGuard.name);

  constructor(
    private readonly agendaSyncSecurityService: AgendaSyncSecurityService,
    private readonly agendaSyncReplayService: AgendaSyncReplayService,
    private readonly agendaSyncRateLimitService: AgendaSyncRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AgendaSyncRequest>();
    const expectedSecret = this.agendaSyncSecurityService.getExpectedSecret();
    const endpointLabel = this.getEndpointLabel();

    if (!expectedSecret) {
      this.logger.warn(`Endpoint ${endpointLabel} rechazado: AGENDA_SYNC_SECRET no configurado`);
      throw new ForbiddenException('Agenda sync is not configured');
    }

    const receivedTimestamp = this.extractFirstHeaderValue(
      request.headers[AGENDA_SYNC_TIMESTAMP_HEADER],
    );
    const receivedSignature = this.extractFirstHeaderValue(
      request.headers[AGENDA_SYNC_SIGNATURE_HEADER],
    );
    const requestPath = this.agendaSyncSecurityService.normalizePath(request.originalUrl);

    if (!receivedTimestamp || !receivedSignature) {
      this.logger.warn(`Endpoint ${endpointLabel} rechazado: headers de firma ausentes`);
      throw new ForbiddenException('Missing agenda sync authentication headers');
    }

    if (!this.agendaSyncSecurityService.isTimestampWithinAllowedWindow(receivedTimestamp)) {
      this.logger.warn(`Endpoint ${endpointLabel} rechazado: timestamp fuera de ventana`);
      throw new ForbiddenException('Expired agenda sync request');
    }

    const isValidSignature = this.agendaSyncSecurityService.isValidSignature({
      method: request.method,
      path: requestPath,
      timestamp: receivedTimestamp,
      receivedSignature,
      secret: expectedSecret,
    });

    if (!isValidSignature) {
      this.logger.warn(`Endpoint ${endpointLabel} rechazado: firma invalida`);
      throw new ForbiddenException('Invalid agenda sync signature');
    }

    const replayTtlMs = this.agendaSyncSecurityService.getMaxTimeSkewMs();
    const isReplayRequest = await this.agendaSyncReplayService.isReplayRequest(
      receivedSignature,
      replayTtlMs,
    );

    if (isReplayRequest) {
      throw new ForbiddenException('Replay agenda sync request');
    }

    const isRateLimitExceeded = await this.agendaSyncRateLimitService.isLimitExceeded(
      this.buildRateLimitScope(requestPath),
    );

    if (isRateLimitExceeded) {
      this.logger.warn(`Endpoint ${endpointLabel} rechazado: rate limit excedido`);
      throw new ForbiddenException(this.getRateLimitExceededMessage());
    }

    return true;
  }

  protected getEndpointLabel(): string {
    return 'de sincronizacion';
  }

  protected buildRateLimitScope(requestPath: string): string {
    void requestPath;
    return 'agenda-sync';
  }

  protected getRateLimitExceededMessage(): string {
    return 'Agenda sync rate limit exceeded';
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
