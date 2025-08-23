import { Injectable, Logger } from '@nestjs/common';
import { OpenAiConfig } from '../config/openai.config';
import { datePrompt, phonePrompt, searchAvailabilityPrompt } from '../prompts';
import { DeleteReservation, SearchAvailability, ResponseDate } from 'src/lib';



@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(private readonly openAi: OpenAiConfig) { }

  async sendMessage(message: string): Promise<ResponseDate> {
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
    console.log(aiResponse);
    
    const parseResponse = JSON.parse(aiResponse);
    
    return parseResponse;
    } catch (error) {
      this.logger.error(`Error al obtener la disponibilidad`, error);
      throw error;
    }
  }

  async getPhoneFromMessage(message:string):Promise<DeleteReservation>{
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
}
