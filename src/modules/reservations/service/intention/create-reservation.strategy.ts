import { Injectable } from "@nestjs/common";
import { IntentionStrategyInterface, StrategyResult } from "./intention-strategy.interface";
import { CacheTypeEnum, Intention, MultipleMessagesResponse, TemporalStatusEnum } from "src/lib";
import { DatesService } from "src/modules/dates/service/dates.service";
import { AddMissingFieldInput } from "src/lib";
import { AiService } from "src/modules/ai/service/ai.service";
import { Logger } from "@nestjs/common";
import { CacheService } from "src/modules/cache-context/cache.service";
@Injectable()
export class CreateReservationStrategy implements IntentionStrategyInterface {
    readonly intent = Intention.CREATE;
    private readonly logger = new Logger(CreateReservationStrategy.name);
    constructor(
        private readonly datesService: DatesService,
        private readonly aiService: AiService,
        private readonly cacheService: CacheService
    ) { }

    async execute(aiResponse: MultipleMessagesResponse): Promise<StrategyResult> {


        const mockedData: AddMissingFieldInput = {
            waId: '123456789',
            values: { // TODO: remove this mock once we receive the phone number from the user
                phone:'1122334455',
                date: aiResponse.date,
                time: aiResponse.time,
                name: aiResponse.name,
                quantity: aiResponse.quantity,
            },
            messageSid: '123',
        }
        const response = await this.datesService.createReservationWithMultipleMessages(mockedData);

        const history = await this.cacheService.getHistory(mockedData.waId);
        
        switch (response.status) {
            case TemporalStatusEnum.IN_PROGRESS:
                this.logger.log(`Create reservation strategy in progress`);
                return {reply: await this.aiService.getMissingData(response.missingFields, history, response.message)};
            
            case TemporalStatusEnum.COMPLETED:
                this.logger.log(`Create reservation strategy completed`);
                await this.cacheService.clearHistory(mockedData.waId, CacheTypeEnum.DATA);
                return {reply: await this.aiService.reservationCompleted(response.reservationData, history)};
            
            case TemporalStatusEnum.FAILED:
                this.logger.log(`Create reservation strategy failed`);
                return {reply: await this.aiService.createReservationFailed(response.reservationData, history, response.message!)};

            default:
                this.logger.warn(`Estado de reserva inesperado: ${response.status}`);
                return {reply:'Hubo un problema al procesar la reserva, por favor intentá nuevamente.'}
        }
    }
}