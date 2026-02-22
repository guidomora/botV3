import { Injectable, Logger } from '@nestjs/common';
import { OpenAiConfig } from '../config/openai.config';
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
import { inferActiveIntent, parseJsonResponse, serializeContext } from '../utils';

interface SocialCourtesyClassificationResponse {
  isSocialCourtesy: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(private readonly openAi: OpenAiConfig) {}


  async interactWithAi(
    message: string,
    messageHistory: ChatMessage[],
  ): Promise<MultipleMessagesResponse> {
    const activeIntent = inferActiveIntent(messageHistory);

    // const last = messageHistory.at(-1);
    // const shouldRemoveLastFromContext =
    //   !!last && last.role === RoleEnum.USER && last.content === message;

    // const contextHistory = shouldRemoveLastFromContext
    //   ? messageHistory.slice(0, -1)
    //   : messageHistory;

    const context = serializeContext(messageHistory);

    const prompt = interactPrompt(context, activeIntent);
    const aiResponse = await this.openAiConfig(prompt, message, true);
    const parseResponse = parseJsonResponse<MultipleMessagesResponse>(aiResponse);
    console.log('----', parseResponse);

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
      this.logger.warn('No se pudo clasificar mensaje social con AI, se continúa flujo normal.');
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
      const response = await this.openAi.getClient().chat.completions.create({
        model: process.env.GPT_MODEL || 'gpt-5-mini',
        response_format: { type: json ? 'json_object' : 'text' },
        temperature: 1,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userMessage || 'Generá el mensaje ahora.' },
        ],
      });

      const aiResponse = response.choices[0].message.content!.trim();
      console.log('AI Response:', aiResponse);

      return aiResponse;
    } catch (error) {
      this.logger.error(`Error al interactuar con AI`, error);
      throw new ProviderError(ProviderName.OPEN_AI, 'Error al interactuar con OpenAI', error);
    }
  }
}
