import { Injectable, Logger } from '@nestjs/common';
import { OpenAiConfig } from '../config/openai.config';
import { cancelDataPrompt, datePrompt, interactPrompt, missingDataPrompt, phonePrompt, reservationCompletedPrompt, searchAvailabilityPrompt } from '../prompts';
import { DeleteReservation, SearchAvailability, ResponseDate, MultipleMessagesResponse, TemporalDataType, ChatMessage } from 'src/lib';
import { inferActiveIntent, serializeContext } from '../utils';
import { missingDataPromptForAvailability } from '../prompts/availability-prompt';




@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(private readonly openAi: OpenAiConfig) { }

  async sendMessage(message: string): Promise<ResponseDate> {
    // TODO: check if it can be removed
    try {
      const response = await this.openAi.getClient().chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          { role: 'system', content: datePrompt },
          { role: 'user', content: message }
        ],
      });

      const aiResponse = response.choices[0]!.message!.content!

      const parseResponse = JSON.parse(aiResponse);

      return parseResponse;
    } catch (error) {
      this.logger.error(`Error al obtener la fecha`, error);
      throw error;
    }
  }

  async getAvailabilityData(message: string): Promise<SearchAvailability> {
    // TODO: check if it can be removed
    try {
      const response = await this.openAi.getClient().chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          { role: 'system', content: searchAvailabilityPrompt },
          { role: 'user', content: message }
        ],
      });

      const aiResponse = response.choices[0]!.message!.content!

      const parseResponse = JSON.parse(aiResponse);

      return parseResponse;
    } catch (error) {
      this.logger.error(`Error al obtener la disponibilidad`, error);
      throw error;
    }
  }

  async getCancelData(message: string): Promise<DeleteReservation> {
    // TODO: check if it can be removed
    try {
      const response = await this.openAi.getClient().chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          { role: 'system', content: phonePrompt },
          { role: 'user', content: message }
        ],
      });

      const aiResponse = response.choices[0]!.message!.content!

      const parseResponse = JSON.parse(aiResponse);

      return parseResponse;
    } catch (error) {
      this.logger.error(`Error al obtener el telefono`, error);
      throw error;
    }
  }

  async interactWithAi(message: string, messageHistory: ChatMessage[]): Promise<MultipleMessagesResponse> {
    const activeIntent = inferActiveIntent(messageHistory);
    const history = messageHistory.at(-1)?.role === 'user' && messageHistory.at(-1)?.content === message
      ? messageHistory.slice(0, -1)
      : messageHistory;

    const context = serializeContext(history);
    const prompt = interactPrompt(context, activeIntent)
    try {
      const response = await this.openAi.getClient().chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message }
        ],
      });

      const aiResponse = response.choices[0]!.message!.content!

      const parseResponse = JSON.parse(aiResponse);
      console.log(parseResponse);

      return parseResponse;
    } catch (error) {
      this.logger.error(`Error al interactuar con el AI`, error);
      throw error;
    }
  }

  async getMissingData(missingFields: string[], messageHistory: ChatMessage[]): Promise<string> {
    const context = serializeContext(messageHistory);
    try {
      const dataPrompt = missingDataPrompt(missingFields, context)
      const response = await this.openAi.getClient().chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'text' },
        temperature: 0,
        messages: [
          { role: 'system', content: dataPrompt },
          { role: 'user', content: 'Generá el mensaje ahora.' }
        ],
      });

      const aiResponse = response.choices[0]!.message!.content!.trim()
      console.log('AI Response:', aiResponse);

      return aiResponse;
    } catch (error) {
      this.logger.error(`Error al interactuar con el AI`, error);
      throw error;
    }
  }

    async getMissingDataForAvailbility(missingFields: string[], messageHistory: ChatMessage[]): Promise<string> {
    const context = serializeContext(messageHistory);
    try {
      const dataPrompt = missingDataPromptForAvailability(missingFields, context)
      const response = await this.openAi.getClient().chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'text' },
        temperature: 0,
        messages: [
          { role: 'system', content: dataPrompt },
          { role: 'user', content: 'Generá el mensaje ahora.' }
        ],
      });

      const aiResponse = response.choices[0]!.message!.content!.trim()
      console.log('AI Response:', aiResponse);

      return aiResponse;
    } catch (error) {
      this.logger.error(`Error al interactuar con el AI`, error);
      throw error;
    }
  }

  async getMissingDataToCancel(missingFields: string[], messageHistory: ChatMessage[],
    known: { phone?: string | null; date?: string | null; time?: string | null; name?: string | null }
  ): Promise<string> {
    const context = serializeContext(messageHistory);
    
    try {
      const dataPrompt = cancelDataPrompt(missingFields, context, known)
      const response = await this.openAi.getClient().chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'text' },
        temperature: 0,
        messages: [
          { role: 'system', content: dataPrompt },
          { role: 'user', content: 'Generá el mensaje ahora.' }
        ],
      });

      const aiResponse = response.choices[0]!.message!.content!.trim()
      console.log('AI Response:', aiResponse);

      return aiResponse;
    } catch (error) {
      this.logger.error(`Error al interactuar con el AI`, error);
      throw error;
    }
  }

  async reservationCompleted(reservationData: TemporalDataType, messageHistory: ChatMessage[]): Promise<string> {
    try {
      const dataPrompt = reservationCompletedPrompt(reservationData, messageHistory)
      const response = await this.openAi.getClient().chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'text' },
        temperature: 0,
        messages: [
          { role: 'system', content: dataPrompt },
          { role: 'user', content: 'Generá el mensaje ahora.' }
        ],
      });

      const aiResponse = response.choices[0]!.message!.content!.trim()
      console.log('AI Response:', aiResponse);

      return aiResponse;
    } catch (error) {
      this.logger.error(`Error al interactuar con el AI`, error);
      throw error;
    }
  }
}
