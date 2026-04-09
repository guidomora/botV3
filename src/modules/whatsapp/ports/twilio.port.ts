export interface TwilioPort {
  sendText(toE164: string, body: string): Promise<unknown>;
  verifySignature(
    url: string,
    params: Record<string, string | undefined>,
    signatureHeader: string,
  ): boolean;
}
