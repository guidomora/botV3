import { Injectable, Logger } from '@nestjs/common';
import { AiService } from 'src/modules/ai/service/ai.service';
import { RoleEnum, SimplifiedTwilioWebhookPayload } from 'src/lib';
import { IntentionsRouter } from './intention/intention.router';
import { CacheService } from 'src/modules/cache-context/cache.service';
@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly router: IntentionsRouter,
    private readonly cacheService: CacheService
  ) { }

  async conversationOrchestrator(message: string, simplifiedPayload: SimplifiedTwilioWebhookPayload): Promise<string> {
    console.log(`Mensaje recibido: ${message}`);
    
    await this.cacheService.appendEntityMessage(simplifiedPayload.waId, message, RoleEnum.USER);

    const history = await this.cacheService.getHistory(simplifiedPayload.waId);

    
    const aiResponse = await this.aiService.interactWithAi(message, history);
    
    const result = await this.router.route(aiResponse, simplifiedPayload);
    
    return result.reply;
  }
}