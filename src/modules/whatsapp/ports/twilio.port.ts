import { TwilioSendTextResult } from 'src/lib';

export interface TwilioPort {
  sendText(toE164: string, body: string): Promise<TwilioSendTextResult>;
  verifySignature(
    url: string,
    params: Record<string, string | undefined>,
    signatureHeader: string,
  ): boolean;
}
