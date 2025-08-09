import { Injectable } from '@nestjs/common';
import { OpenAiConfig } from '../config/openai.config';
import { datePrompt } from '../prompts';
import { ResponseDate } from 'src/lib/types/ai-response/response-date';


@Injectable()
export class AiService {
  constructor(private readonly openAi: OpenAiConfig) { }

  async sendMessage(message: string): Promise<ResponseDate> {
    const response = await this.openAi.getClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: datePrompt },
        { role: 'user', content: message }
      ],
    });

    const aiResponse = response.choices[0]?.message?.content ?? 'No response from OpenAI';

    const parseResponse = JSON.parse(aiResponse);
    
    return parseResponse;
  }

}
