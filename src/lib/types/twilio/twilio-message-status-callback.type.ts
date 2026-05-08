export type TwilioOutboundMessageStatus =
  | 'accepted'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'undelivered';

export interface TwilioMessageStatusCallbackPayload {
  MessageSid: string;
  MessageStatus: TwilioOutboundMessageStatus;
  AccountSid?: string;
  From?: string;
  To?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  SmsSid?: string;
  SmsStatus?: string;
  MessagingServiceSid?: string;
  [key: string]: string | undefined;
}

export interface TwilioSendTextResult {
  sid?: string;
  status?: string;
}
