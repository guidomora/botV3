import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAiConfig {
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
}
