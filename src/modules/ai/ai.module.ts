import { Module } from '@nestjs/common';
import { AiService } from './service/ai.service';
import { OpenAiConfig } from './config/openai.config';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [],
  imports: [ConfigModule],
  providers: [AiService, OpenAiConfig],
  exports: [AiService],
})
export class AiModule {}
