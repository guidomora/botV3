import { TwilioWebhookPayload } from './webhook-payload-received.type';

export type RequestWithTwilioData = {
  body?: TwilioWebhookPayload;
  headers: Record<string, string | string[] | undefined>;
  originalUrl: string;
  protocol?: string;
  get?: (name: string) => string | undefined;
};
