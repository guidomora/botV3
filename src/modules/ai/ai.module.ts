import { Module } from '@nestjs/common';
import { AiService } from './service/ai.service';
import { ConfigModule } from '@nestjs/config';
import { aiProviders } from './ai.providers';

@Module({
  controllers: [],
  imports: [ConfigModule],
  providers: [AiService, ...aiProviders],
  exports: [AiService],
})
export class AiModule {}
