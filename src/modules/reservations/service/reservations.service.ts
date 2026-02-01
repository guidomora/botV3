import { Injectable, Logger } from '@nestjs/common';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { AiService } from 'src/modules/ai/service/ai.service';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { AddMissingFieldInput, RoleEnum, TemporalStatusEnum } from 'src/lib';
import { IntentionsRouter } from './intention/intention.router';
import { CacheService } from 'src/modules/cache-context/cache.service';
@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly datesService: DatesService,
    private readonly aiService: AiService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly router: IntentionsRouter,
    private readonly cacheService: CacheService
  ) { }

  async conversationOrchestrator(message: string): Promise<string> {
    const waId = "123456789";

    console.log(`Mensaje recibido: ${message}`);
    
    await this.cacheService.appendEntityMessage(waId, message, RoleEnum.USER);

    const history = await this.cacheService.getHistory(waId);

    
    const aiResponse = await this.aiService.interactWithAi(message, history);
    
    const result = await this.router.route(aiResponse);
    
    return result.reply;
  }
}