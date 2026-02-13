// whatsapp.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReservationsModule } from '../reservations/reservations.module';
import { TwilioAdapter } from './adapters/twilio.adapter';
import { WhatsAppController } from './controller/whatsapp.controller';
import { RateLimitService } from './service/rate-limit.service';
import { WhatsAppService } from './service/whatsapp.service';
import twilioConfig from './twilio.config';
import { TwilioClientProvider } from './twilio.provider';

@Module({})
export class WhatsAppModule {
  static forRootAsync(): DynamicModule {
    return {
      module: WhatsAppModule,
      controllers: [WhatsAppController],
      imports: [ConfigModule.forFeature(twilioConfig), ReservationsModule],
      providers: [TwilioClientProvider, TwilioAdapter, WhatsAppService, RateLimitService],
      exports: [WhatsAppService],
    };
  }
}
