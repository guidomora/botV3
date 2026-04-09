import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  askDateAvailabilityPrompt,
  availabilityReplyPrompt,
  cancelDataPrompt,
  cancelReservationResultPrompt,
  interactPrompt,
  missingDataPrompt,
  otherPrompt,
  reservationCompletedPrompt,
  reservationCreationFailedPrompt,
  socialCourtesyClassificationPrompt,
  timeAvailabilityReplyPrompt,
  updateReservationPhonePrompt,
  updateReservationPrompt,
} from '../prompts';
import {
  DeleteReservation,
  MultipleMessagesResponse,
  TemporalDataType,
  ChatMessage,
  AvailabilityResponse,
  UpdateReservationType,
  ProviderError,
  ProviderName,
} from 'src/lib';
import { AI_CLIENT_PORT } from '../ai.tokens';
import { AiClientPort } from '../ports';
import { inferActiveIntent, parseJsonResponse, serializeContext } from '../utils';

interface SocialCourtesyClassificationResponse {
  isSocialCourtesy: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(@Inject(AI_CLIENT_PORT) private readonly openAiClient: AiClientPort) {}

  async interactWithAi(
    message: string,
    messageHistory: ChatMessage[],
  ): Promise<MultipleMessagesResponse> {
    const activeIntent = inferActiveIntent(messageHistory);

    const context = serializeContext(messageHistory);

    const prompt = interactPrompt(context, activeIntent);
    const aiResponse = await this.openAiConfig(prompt, message, true);
    const parseResponse = parseJsonResponse<MultipleMessagesResponse>(aiResponse);

    return parseResponse;
  }

  async getMissingData(
    missingFields: string[],
    messageHistory: ChatMessage[],
    message?: string,
  ): Promise<string> {
    const context = serializeContext(messageHistory);
    const dataPrompt = missingDataPrompt(missingFields, context, message);

    return this.openAiConfig(dataPrompt);
  }

  async getMissingDataToCancel(
    missingFields: string[],
    messageHistory: ChatMessage[],
    known: {
      phone?: string | null;
      date?: string | null;
      time?: string | null;
      name?: string | null;
    },
  ): Promise<string> {
    const context = serializeContext(messageHistory);

    const dataPrompt = cancelDataPrompt(missingFields, context, known);

    return this.openAiConfig(dataPrompt);
  }

  async reservationCompleted(
    reservationData: TemporalDataType,
    messageHistory: ChatMessage[],
  ): Promise<string> {
    const context = serializeContext(messageHistory);
    const dataPrompt = reservationCompletedPrompt(reservationData, context);

    return this.openAiConfig(dataPrompt);
  }

  async createReservationFailed(
    reservationData: TemporalDataType,
    messageHistory: ChatMessage[],
    errorMessage: string,
  ): Promise<string> {
    const context = serializeContext(messageHistory);
    const dataPrompt = reservationCreationFailedPrompt(reservationData, context, errorMessage);

    return this.openAiConfig(dataPrompt);
  }

  async dayAvailabilityAiResponse(
    dayAvailability: AvailabilityResponse,
    messageHistory: ChatMessage[],
  ): Promise<string> {
    const context = serializeContext(messageHistory);
    const dataPrompt = availabilityReplyPrompt(dayAvailability, context);

    return this.openAiConfig(dataPrompt);
  }

  async dayAndTimeAvailabilityAiResponse(
    dayAvailability: AvailabilityResponse,
    messageHistory: ChatMessage[],
    requestedTime?: string | null,
  ): Promise<string> {
    const context = serializeContext(messageHistory);

    const dataPrompt = timeAvailabilityReplyPrompt(dayAvailability, context, requestedTime);

    return this.openAiConfig(dataPrompt);
  }

  async askUpdateReservationData(
    missingFields: string[],
    messageHistory: ChatMessage[],
    known: UpdateReservationType,
  ) {
    const context = serializeContext(messageHistory);

    const dataPrompt = updateReservationPrompt(missingFields, context, known);

    return this.openAiConfig(dataPrompt);
  }

  async askUpdateReservationPhone(messageHistory: ChatMessage[], known: UpdateReservationType) {
    const context = serializeContext(messageHistory);

    const dataPrompt = updateReservationPhonePrompt(context, known);

    return this.openAiConfig(dataPrompt);
  }

  async askDateForAvailabilityAi(messageHistory: ChatMessage[]): Promise<string> {
    const context = serializeContext(messageHistory);

    const dataPrompt = askDateAvailabilityPrompt(context);

    return this.openAiConfig(dataPrompt);
  }

  async isSocialCourtesyMessage(message: string): Promise<boolean> {
    try {
      const prompt = socialCourtesyClassificationPrompt();
      const aiResponse = await this.openAiConfig(prompt, message, true);
      const parsed = parseJsonResponse<SocialCourtesyClassificationResponse>(aiResponse);

      return parsed.isSocialCourtesy === true;
    } catch {
      this.logger.warn('No se pudo clasificar mensaje social con AI, se continua flujo normal.');
      return false;
    }
  }

  async otherIntentionAi(messageHistory: ChatMessage[]): Promise<string> {
    const context = serializeContext(messageHistory);

    const dataPrompt = otherPrompt(context);

    return this.openAiConfig(dataPrompt);
  }

  async cancelReservationResult(
    statusMessage: string,
    messageHistory: ChatMessage[],
    reservationData: DeleteReservation,
  ): Promise<string> {
    const context = serializeContext(messageHistory);
    const dataPrompt = cancelReservationResultPrompt(statusMessage, context, reservationData);

    return this.openAiConfig(dataPrompt);
  }

  async openAiConfig(prompt: string, userMessage?: string, json?: boolean): Promise<string> {
    try {
      return await this.openAiClient.createChatCompletion({
        model: process.env.GPT_MODEL || 'gpt-5-mini',
        responseFormat: json ? 'json_object' : 'text',
        temperature: 1,
        systemPrompt: prompt,
        userMessage: userMessage || 'Genera el mensaje ahora.',
      });
    } catch (error) {
      this.logger.error(`Error al interactuar con AI`, error);
      throw new ProviderError(ProviderName.OPEN_AI, 'Error al interactuar con OpenAI', error);
    }
  }
}
