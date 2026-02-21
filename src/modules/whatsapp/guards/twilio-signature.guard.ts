import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { WhatsAppService } from '../service/whatsapp.service';
import { RequestWithTwilioData } from 'src/lib';

@Injectable()
export class TwilioSignatureGuard implements CanActivate {
  private readonly logger = new Logger(TwilioSignatureGuard.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithTwilioData>();
    const signatureHeader = this.getSignatureHeader(request.headers);

    if (!signatureHeader) {
      this.logger.warn('Webhook rechazado: header x-twilio-signature ausente');
      throw new ForbiddenException('Invalid Twilio signature');
    }

    const fullRequestUrl = this.buildPublicRequestUrl(request);

    const requestParams = (request.body ?? {}) as Record<string, string | undefined>;

    const isValidSignature = this.whatsAppService.verifySignature(
      fullRequestUrl,
      requestParams,
      signatureHeader,
    );

    if (!isValidSignature) {
      this.logger.warn(`Webhook rechazado: firma inválida para URL ${fullRequestUrl}`);
      throw new ForbiddenException('Invalid Twilio signature');
    }

    return true;
  }

  private getSignatureHeader(
    headers: Record<string, string | string[] | undefined>,
  ): string | undefined {
    const signature = headers['x-twilio-signature'];

    if (Array.isArray(signature)) {
      return signature[0];
    }

    return signature;
  }

  private buildPublicRequestUrl(request: RequestWithTwilioData): string {
    const forwardedProto = request.headers['x-forwarded-proto'];
    const forwardedHost = request.headers['x-forwarded-host'];

    const protocol = this.extractFirstHeaderValue(forwardedProto) ?? request.protocol ?? 'https';

    const host =
      this.extractFirstHeaderValue(forwardedHost) ??
      request.get?.('host') ??
      this.extractFirstHeaderValue(request.headers.host);

    if (!host) {
      throw new ForbiddenException('Unable to resolve request host');
    }

    return `${protocol}://${host}${request.originalUrl}`;
  }

  private extractFirstHeaderValue(headerValue: string | string[] | undefined): string | undefined {
    if (!headerValue) {
      return undefined;
    }

    if (Array.isArray(headerValue)) {
      return headerValue[0]?.trim();
    }

    return headerValue.split(',')[0]?.trim();
  }
}
