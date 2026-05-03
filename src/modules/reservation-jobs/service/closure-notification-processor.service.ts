import { Inject, Injectable, Logger } from '@nestjs/common';
import { RESTAURANT_NAME } from 'src/constants';
import { AffectedReservationState, ClosureNotificationJobData, RoleEnum } from 'src/lib';
import { CacheService } from 'src/modules/cache-context/cache.service';
import { TwilioPort } from 'src/modules/whatsapp/ports';
import { TWILIO_PORT } from 'src/modules/whatsapp/whatsapp.tokens';

@Injectable()
export class ClosureNotificationProcessorService {
  private readonly logger = new Logger(ClosureNotificationProcessorService.name);

  constructor(
    @Inject(TWILIO_PORT)
    private readonly twilioPort: TwilioPort,
    private readonly cacheService: CacheService,
  ) {}

  async notifyReservation(data: ClosureNotificationJobData): Promise<void> {
    const waId = this.normalizePhoneForWaId(data.reservation.phone);
    const message = this.buildMessage(data);
    const notificationKey = this.buildNotificationKey(data, waId);
    const currentNotificationState =
      await this.cacheService.getClosureNotificationState(notificationKey);

    if (currentNotificationState?.status === 'context_saved') {
      this.logger.log(
        `Notificacion de cierre ya procesada notificationKey=${notificationKey} phone=${waId}`,
      );
      return;
    }

    const sentAt = currentNotificationState?.sentAt ?? Date.now();

    if (!currentNotificationState?.sentAt) {
      await this.twilioPort.sendText(waId, message);
      await this.cacheService.setClosureNotificationState(notificationKey, {
        status: 'sent',
        sentAt,
      });
    }

    await this.cacheService.appendEntityMessage(waId, message, RoleEnum.ASSISTANT);
    await this.cacheService.setAffectedReservationState(waId, this.buildAffectedState(data, waId));
    await this.cacheService.setClosureNotificationState(notificationKey, {
      status: 'context_saved',
      sentAt,
      contextSavedAt: Date.now(),
    });

    this.logger.log(
      `Notificacion de cierre enviada phone=${waId} date=${data.sheetDate} time=${data.reservation.time}`,
    );
  }

  private buildAffectedState(
    data: ClosureNotificationJobData,
    normalizedPhone: string,
  ): AffectedReservationState {
    return {
      name: data.reservation.name,
      phone: normalizedPhone,
      date: data.reservation.date,
      time: data.reservation.time,
      quantity: data.reservation.quantity,
      closureType: data.closureType,
      closureReason: data.reason ?? null,
      notifiedAt: Date.now(),
    };
  }

  private buildMessage(data: ClosureNotificationJobData): string {
    const closureDescription =
      data.closureType === 'day'
        ? `permaneceremos cerrados el ${data.sheetDate}`
        : `cerraremos la franja de ${data.fromTime} a ${data.toTime} del ${data.sheetDate}`;
    const reasonLine = data.reason ? `\nMotivo: ${data.reason}` : '';

    return (
      `Hola ${data.reservation.name}, te avisamos desde ${RESTAURANT_NAME} que ${closureDescription}, ` +
      `por lo que no podremos mantener tu reserva de las ${data.reservation.time}.` +
      reasonLine +
      '\nPodés responder este mensaje para reprogramarla o cancelarla. Disculpá las molestias.'
    );
  }

  private normalizePhoneForWaId(phone: string): string {
    return phone.replace(/\D+/g, '');
  }

  private buildNotificationKey(data: ClosureNotificationJobData, waId: string): string {
    return [
      data.closureType,
      data.date,
      data.fromTime ?? 'day',
      data.toTime ?? 'day',
      data.reservation.date,
      data.reservation.time,
      waId,
    ]
      .map((part) => this.normalizeKeyPart(part))
      .join(':');
  }

  private normalizeKeyPart(part: string): string {
    return part
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
