export interface TwilioWebhookPayload {
  Body: string;
  From: string;
  To: string;
  WaId?: string;
  ProfileName?: string;
  MessageSid: string;
  AccountSid: string;
  NumMedia?: string;
  MessageType?: string;
  ChannelMetadata?: string;

  [key: string]: string | undefined;
}

export interface SimplifiedTwilioWebhookPayload {
  body: string;
  from: string;
  waId: string;
  profileName: string;
  messageSid: string;
  accountSid: string;
  messageType: string;
}
