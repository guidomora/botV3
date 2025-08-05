import { Module } from '@nestjs/common';
import { AiService } from './service/ai.service';
import { AiController } from './controller/ai.controller';
import { OpenAiConfig } from './config/openai.config';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [AiController],
  imports: [ConfigModule],
  providers: [AiService, OpenAiConfig],
})
export class AiModule {}
