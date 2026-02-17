// whatsapp.module.ts
import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReservationsModule } from '../reservations/reservations.module';
import { TwilioAdapter } from './adapters/twilio.adapter';
import { WhatsAppController } from './controller/whatsapp.controller';
import { TwilioSignatureGuard } from './guards/twilio-signature.guard';
import { WhatsAppIdempotencyGuard } from './guards/whatsapp-idempotency.guard';
import { WhatsAppRateLimitGuard } from './guards/whatsapp-rate-limit.guard';
import { IdempotencyService } from './service/idempotency.service';
import { RateLimitService } from './service/rate-limit.service';
import { WhatsAppService } from './service/whatsapp.service';
import twilioConfig from './twilio.config';
import { TwilioClientProvider } from './twilio.provider';
import { RequestSizeLimitMiddleware } from './middlewares/request-size-limit.middleware';

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
      imports: [ConfigModule.forFeature(twilioConfig), ReservationsModule],
      providers: [
        TwilioClientProvider,
        TwilioAdapter,
        WhatsAppService,
        IdempotencyService,
        RateLimitService,
        TwilioSignatureGuard,
        WhatsAppIdempotencyGuard,
        WhatsAppRateLimitGuard,
        RequestSizeLimitMiddleware,
      ],
      exports: [WhatsAppService],
    };
  }
}
