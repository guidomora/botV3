import { Provider } from '@nestjs/common';
import { TwilioAdapter } from './adapters/twilio.adapter';
import { TwilioClientProvider } from './twilio.provider';
import { WHATSAPP_CLIENT_PORT } from './whatsapp.tokens';

export const whatsappProviders: Provider[] = [
  TwilioClientProvider,
  TwilioAdapter,
  {
    provide: WHATSAPP_CLIENT_PORT,
    useExisting: TwilioAdapter,
  },
];
