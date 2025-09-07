// whatsapp.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import twilioConfig from './twilio.config';
import { TwilioClientProvider } from './twilio.provider';
import { WhatsAppService } from './service/whats-app.service';
import { WhatsAppController } from './controller/whats-app.controller';

@Module({})
export class WhatsAppModule {
  static forRootAsync(): DynamicModule {
    return {
      module: WhatsAppModule,
      controllers: [WhatsAppController],
      imports: [ConfigModule.forFeature(twilioConfig)],
      providers: [TwilioClientProvider, WhatsAppService],
      exports: [WhatsAppService],
    };
  }
}
