import { Injectable, Logger } from '@nestjs/common';
import { OpenAiConfig } from '../config/openai.config';
import { datePrompt } from '../prompts';
import { ResponseDate } from 'src/lib/types/ai-response/response-date';


@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(private readonly openAi: OpenAiConfig) { }

  async sendMessage(message: string): Promise<ResponseDate> {
    try {
      const response = await this.openAi.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: datePrompt },
          { role: 'user', content: message }
      ],
    });

    const aiResponse = response.choices[0]?.message?.content ?? 'No response from OpenAI'
    
    const parseResponse = JSON.parse(aiResponse);
    
    return parseResponse;
    } catch (error) {
      this.logger.error(`Error al obtener la fecha`, error);
      throw error;
    }
  }

}
