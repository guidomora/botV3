// whatsapp.module.ts
import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BillingUsageModule } from '../billing-usage/billing-usage.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { WhatsAppController } from './controller/whatsapp.controller';
import { TwilioSignatureGuard } from './guards/twilio-signature.guard';
import { WhatsAppIdempotencyGuard } from './guards/whatsapp-idempotency.guard';
import { WhatsAppRateLimitGuard } from './guards/whatsapp-rate-limit.guard';
import { WhatsAppUsageLimitGuard } from './guards/whatsapp-usage-limit.guard';
import { IdempotencyService } from './service/idempotency.service';
import { RateLimitService } from './service/rate-limit.service';
import { WhatsAppService } from './service/whatsapp.service';
import twilioConfig from './twilio.config';
import { RequestSizeLimitMiddleware } from './middlewares/request-size-limit.middleware';
import { whatsappProviders } from './whatsapp.providers';

@Module({})
export class WhatsAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestSizeLimitMiddleware)
      .forRoutes({ path: 'communication/queue', method: RequestMethod.POST });
  }

  static forRootAsync(): DynamicModule {
    return {
      module: WhatsAppModule,
      controllers: [WhatsAppController],
      imports: [ConfigModule.forFeature(twilioConfig), ReservationsModule, BillingUsageModule],
      providers: [
        WhatsAppService,
        IdempotencyService,
        RateLimitService,
        TwilioSignatureGuard,
        WhatsAppIdempotencyGuard,
        WhatsAppUsageLimitGuard,
        WhatsAppRateLimitGuard,
        RequestSizeLimitMiddleware,
        ...whatsappProviders,
      ],
      exports: [WhatsAppService],
    };
  }
}
