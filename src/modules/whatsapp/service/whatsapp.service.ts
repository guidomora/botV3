import { Injectable, Logger } from '@nestjs/common';
import { RATE_LIMIT_MESSAGE, UNSUPPORTED_MESSAGE } from 'src/constants';
import { BufferEntry, RateLimitDecision, SimplifiedTwilioWebhookPayload } from 'src/lib';
import { ReservationsService } from 'src/modules/reservations/service/reservations.service';
import { TwilioAdapter } from '../adapters/twilio.adapter';
import { setTimeLapse } from '../utils/utils';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private buffers = new Map<string, BufferEntry>();

  constructor(
    private readonly twilioAdapter: TwilioAdapter,
    private readonly reservationsService: ReservationsService,
    private readonly rateLimitService: RateLimitService,
  ) { }

  async sendText(toE164: string, body: string) {
    return this.twilioAdapter.sendText(toE164, body);
  }

  getUnsupportedMessageReply(): string {
    return UNSUPPORTED_MESSAGE;
  }

  getRateLimitMessage(retryAfterSeconds: number): string {
    return `${RATE_LIMIT_MESSAGE} (Intentá nuevamente en ${retryAfterSeconds}s).`;
  }

  async evaluateInboundRateLimit(waId: string): Promise<RateLimitDecision> {
    return this.rateLimitService.evaluateInboundMessage(waId);
  }

  async handleInboundMessage(params: SimplifiedTwilioWebhookPayload, message: string) {
    const waId = params.waId;
    console.log('mesage!!', message);

    await this.sendText(waId!, message);
  }

  verifySignature(url: string, params: Record<string, any>, signatureHeader: string): boolean {
    return this.twilioAdapter.verifySignature(url, params, signatureHeader);
  }

  async handleMultipleMessages(simplifiedPayload: SimplifiedTwilioWebhookPayload, text: string): Promise<string | undefined> {
    const entry = this.buffers.get(simplifiedPayload.waId) ?? { messages: [], resolvers: [], sequence: 0 };

    entry.resolvers ??= [];
    entry.sequence = (entry.sequence ?? 0) + 1;
    const currentId = entry.sequence;

    entry.messages.push(text.trim());

    if (entry.timer) clearTimeout(entry.timer);

    this.logger.log(`Message received and processed for ${simplifiedPayload.waId}`);

    const responsePromise = new Promise<string | undefined>((resolve) => {
      entry.resolvers?.push({ id: currentId, resolve });
    });

    entry.timer = setTimeout(async () => {
      const currentEntry = this.buffers.get(simplifiedPayload.waId);

      if (!currentEntry) return;

      try {
        const response = await this.processBufferedMessages(simplifiedPayload.waId, simplifiedPayload);
        const latestId = currentEntry.sequence ?? 0;

        currentEntry.resolvers?.forEach(({ id, resolve }) => {
          resolve(id === latestId ? response : undefined);
        });
      } catch (err) {
        this.logger.error(`Process failed for ${simplifiedPayload.waId}`, err instanceof Error ? err.stack : err);

        currentEntry.resolvers?.forEach(({ resolve }) => resolve(undefined));
      }
    }, setTimeLapse(text));

    this.buffers.set(simplifiedPayload.waId, entry);
    return responsePromise;
  }

  private async processBufferedMessages(waId: string, simplifiedPayload: SimplifiedTwilioWebhookPayload) {
    const entry = this.buffers.get(waId);
    if (!entry) return;

    const joinedMessages = entry.messages.join(' ').replace(/\s+/g, ' ').trim();
    this.buffers.delete(waId);

    if (!joinedMessages) return;
    return this.reservationsService.conversationOrchestrator(joinedMessages, simplifiedPayload);
  }
}
