import { registerAs } from '@nestjs/config';

export default registerAs('twilio', () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromWhatsApp: process.env.TWILIO_WHATSAPP_FROM, // ej: 'whatsapp:+14155238886'
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID, // opcional
}));
