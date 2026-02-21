import { TwilioWebhookPayloadDto } from 'src/lib';

export type RequestWithTwilioData = {
  body?: TwilioWebhookPayloadDto;
  headers: Record<string, string | string[] | undefined>;
  originalUrl: string;
  protocol?: string;
  get?: (name: string) => string | undefined;
};
