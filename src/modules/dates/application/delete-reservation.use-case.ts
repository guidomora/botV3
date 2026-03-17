import { Injectable } from '@nestjs/common';
import { SHEETS_NAMES } from 'src/constants';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { DeleteReservation, GetIndexParams, UpdateParams } from 'src/lib';
import { Logger } from '@nestjs/common';
import { GenerateDatetime } from '../dateTime-build/generate-datetime';
import { parseDate } from '../utils/parseDate';

@Injectable()
export class DeleteReservationUseCase {
  private readonly logger = new Logger(DeleteReservationUseCase.name);
  private readonly rowStart = 4;

  constructor(
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly generateDatetime: GenerateDatetime,
  ) {}

  async deleteReservation(deleteReservation: DeleteReservation): Promise<string> {
    const { phone, date, time, name } = deleteReservation;

    const getIndexParams: GetIndexParams = {
      date: date!,
      time: time!,
      name: name!.toLowerCase(),
      phone: phone!,
    };

    try {
      const index = await this.googleSheetsService.getDateIndexByData(getIndexParams);

      if (index === -1) {
        this.logger.warn('Alguno de los datos no coincide con la reserva');
        return 'Algunos de los datos ingresados no coinciden con la reserva.';
      }

      const dates = await this.googleSheetsService.getDatetimeDates(date!, time!);

      if (dates.length === 1) {
        await this.googleSheetsService.deleteReservation(`${SHEETS_NAMES[0]}!C${index}:F${index}`);
      } else {
        await this.googleSheetsService.deleteRow(index, 0);
      }

      const availabilityFromReservations =
        await this.googleSheetsService.getAvailabilityFromReservations(date!, time!);
      console.log('availabilityFromReservations', availabilityFromReservations);

      const updateParams: UpdateParams = {
        reservations: availabilityFromReservations.reservations,
        available: availabilityFromReservations.available,
        date: date!,
        time: time!,
      };

      await this.googleSheetsService.updateAvailabilityFromReservations(updateParams);
      await this.googleSheetsService.refreshAvailabilityForDate(date!);
      this.logger.log(
        `Reserva eliminada correctamente para el dia ${date} a las ${time} para ${phone}`,
        DeleteReservationUseCase.name,
      );

      return 'Su reserva ha sido cancelada correctamente.';
    } catch (error) {
      this.logger.error(`Error al eliminar la reserva`, error);
      throw error;
    }
  }

  async deleteOldRows() {
    try {
      const retentionDays = this.getRetentionDays();
      const deleteTillDate = this.generateDatetime.createPastDay(retentionDays - 1);
      const oldestRegisteredDate = await this.googleSheetsService.getFirstRowValue(
        `${SHEETS_NAMES[1]}!A${this.rowStart}:A`,
      );

      if (oldestRegisteredDate === 'no hay valores') {
        this.logger.log('No hay filas antiguas para eliminar porque la agenda esta vacia.');
        return 'No hay filas antiguas para eliminar.';
      }

      const oldestDate = parseDate(oldestRegisteredDate);
      const cutoffDate = parseDate(deleteTillDate);

      if (oldestDate >= cutoffDate) {
        this.logger.log(
          `No hay filas antiguas para eliminar. La agenda ya conserva ${retentionDays} dias hacia atras.`,
        );
        return 'No hay filas antiguas para eliminar.';
      }

      const rowEndFirstSheet = await this.googleSheetsService.getDateIndexByDate(deleteTillDate, 0);

      if (rowEndFirstSheet === -1) {
        this.logger.warn('No se encontro la fecha de corte para la hoja de reservas');
        return 'No se encontro la fecha de corte.';
      }

      await this.googleSheetsService.deleteOldRows(this.rowStart, rowEndFirstSheet, 0);

      this.logger.log(
        `Filas antiguas eliminadas correctamente para la hoja de reservas hasta ${deleteTillDate}`,
        DeleteReservationUseCase.name,
      );

      const rowEndSecondSheet = await this.googleSheetsService.getDateIndexByDate(
        deleteTillDate,
        1,
      );

      if (rowEndSecondSheet === -1) {
        this.logger.warn('No se encontro la fecha de corte para la hoja de disponibilidad');
        return 'No se encontro la fecha de corte.';
      }

      await this.googleSheetsService.deleteOldRows(this.rowStart, rowEndSecondSheet, 1);

      this.logger.log(
        `Filas antiguas eliminadas correctamente para la hoja de disponibilidad hasta ${deleteTillDate}`,
        DeleteReservationUseCase.name,
      );

      return `Se eliminaron las filas anteriores a ${deleteTillDate}.`;
    } catch (error) {
      this.logger.error(`Error al eliminar las filas antiguas`, error);
      throw error;
    }
  }

  private getRetentionDays(): number {
    const retentionDays = Number(process.env.AGENDA_DAYS_BACK_TO_KEEP);

    if (!Number.isInteger(retentionDays) || retentionDays <= 0) {
      throw new Error(
        'La variable de entorno AGENDA_DAYS_BACK_TO_KEEP debe ser un numero entero mayor a 0.',
      );
    }

    return retentionDays;
  }
}
