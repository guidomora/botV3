import { Provider } from '@nestjs/common';
import { OpenAiConfig } from './config/openai.config';
import { AI_CLIENT_PORT } from './ai.tokens';

export const aiProviders: Provider[] = [
  OpenAiConfig,
  {
    provide: AI_CLIENT_PORT,
    useExisting: OpenAiConfig,
  },
];
