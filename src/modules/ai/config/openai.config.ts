import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAiConfig {
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPEN_AI');
    const projectId = this.configService.get<string>('PROJECT_ID'); // opcional

    this.openai = new OpenAI({
      apiKey,
      project: projectId,
    });
  }

  getClient(): OpenAI {
    return this.openai;
  }
}
