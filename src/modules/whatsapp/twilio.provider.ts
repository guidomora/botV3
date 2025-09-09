import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export const TWILIO_CLIENT = Symbol('TWILIO_CLIENT');

export const TwilioClientProvider = {
  provide: TWILIO_CLIENT,
  useFactory: (config: ConfigService) => {
    const sid = config.get<string>('twilio.accountSid');
    const token = config.get<string>('twilio.authToken');

    if (!sid || !token) {
      throw new Error('Faltan TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN');
    }

    return new Twilio(sid, token, { lazyLoading: true });
  },
  inject: [ConfigService],
};