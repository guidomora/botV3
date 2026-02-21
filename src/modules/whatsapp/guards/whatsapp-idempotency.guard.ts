import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { TwilioWebhookPayloadDto } from 'src/lib';
import { IdempotencyService } from '../service/idempotency.service';

@Injectable()
export class WhatsAppIdempotencyGuard implements CanActivate {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ body?: TwilioWebhookPayloadDto }>();

    const accountSid = request.body?.AccountSid;
    const messageSid = request.body?.MessageSid;

    if (!accountSid || !messageSid) {
      return true;
    }

    const isDuplicate = await this.idempotencyService.isDuplicateMessage(accountSid, messageSid);

    if (isDuplicate) {
      throw new HttpException({ ok: true }, HttpStatus.OK);
    }

    return true;
  }
}
