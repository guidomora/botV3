import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { AiClientPort } from '../ports';

@Injectable()
export class OpenAiConfig implements AiClientPort {
  private readonly openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPEN_AI;
    const projectId = process.env.PROJECT_ID; // opcional

    this.openai = new OpenAI({
      apiKey,
      project: projectId,
    });
  }

  getClient(): OpenAI {
    return this.openai;
  }

  async createChatCompletion(params: {
    model: string;
    responseFormat: 'json_object' | 'text';
    temperature: number;
    systemPrompt: string;
    userMessage: string;
  }): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: params.model,
      response_format: { type: params.responseFormat },
      temperature: params.temperature,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
    });

    return response.choices[0].message.content!.trim();
  }
}
