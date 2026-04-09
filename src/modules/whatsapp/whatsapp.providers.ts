import { Provider } from '@nestjs/common';
import { TwilioAdapter } from './adapters/twilio.adapter';
import { TwilioClientProvider } from './twilio.provider';
import { TWILIO_PORT } from './whatsapp.tokens';

export const whatsappProviders: Provider[] = [
  TwilioClientProvider,
  TwilioAdapter,
  {
    provide: TWILIO_PORT,
    useExisting: TwilioAdapter,
  },
];
