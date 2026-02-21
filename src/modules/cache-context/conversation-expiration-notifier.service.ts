import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

type ExpirationStatus = 'in_progress' | 'completed';

@Injectable()
export class ConversationExpirationNotifierService {
  private readonly logger = new Logger(ConversationExpirationNotifierService.name);
  private readonly twilioClient: Twilio | null;
  private readonly fromWhatsApp?: string;
  private readonly messagingServiceSid?: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    this.fromWhatsApp = this.configService.get<string>('TWILIO_WHATSAPP_FROM') ?? undefined;
    this.messagingServiceSid =
      this.configService.get<string>('TWILIO_MESSAGING_SERVICE_SID') ?? undefined;

    if (!accountSid || !authToken || (!this.fromWhatsApp && !this.messagingServiceSid)) {
      this.twilioClient = null;
      this.logger.warn(
        'Twilio no está configurado para enviar mensajes de expiración de conversación',
      );
      return;
    }

    this.twilioClient = new Twilio(accountSid, authToken, {
      lazyLoading: true,
    });
  }

  private toWhatsAppAddress(waId: string): string {
    return waId.startsWith('whatsapp:') ? waId : `whatsapp:${waId}`;
  }

  private buildExpirationMessage(status: ExpirationStatus): string {
    if (status === 'in_progress') {
      return 'Dimos por finalizada la conversación por inactividad. Si querés continuar, iniciá nuevamente y te ayudo desde cero.';
    }

    return 'La conversación se cerró por inactividad. Si necesitás hacer un cambio o una nueva consulta, escribime y seguimos.';
  }

  async sendConversationExpiredMessage(waId: string, status: ExpirationStatus): Promise<void> {
    if (!this.twilioClient) {
      this.logger.warn(
        `No se pudo notificar expiración para ${waId} porque Twilio no está configurado`,
      );
      return;
    }

    const to = this.toWhatsAppAddress(waId);
    const body = this.buildExpirationMessage(status);

    try {
      await this.twilioClient.messages.create({
        body,
        to,
        ...(this.messagingServiceSid
          ? { messagingServiceSid: this.messagingServiceSid }
          : { from: this.fromWhatsApp! }),
      });
      this.logger.log(`Notificación de expiración enviada a ${to}`);
    } catch (error) {
      this.logger.error(`Error enviando notificación de expiración a ${to}`, error as Error);
    }
  }
}
