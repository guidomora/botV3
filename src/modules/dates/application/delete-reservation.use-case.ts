import { Inject, Injectable } from '@nestjs/common';
import { SHEETS_NAMES } from 'src/constants';
import { DeleteReservation, GetIndexParams, UpdateParams } from 'src/lib';
import { Logger } from '@nestjs/common';
import { GenerateDatetime } from '../dateTime-build/generate-datetime';
import { parseDate } from '../utils/parseDate';
import { DATES_SHEET_PORT, DATES_TEMPORAL_SHEET_PORT } from '../dates.tokens';
import { DatesSheetPort, DatesTemporalSheetPort } from '../ports';

@Injectable()
export class DeleteReservationUseCase {
  private readonly logger = new Logger(DeleteReservationUseCase.name);
  private readonly rowStart = 4;

  constructor(
    @Inject(DATES_SHEET_PORT) private readonly datesSheetPort: DatesSheetPort,
    @Inject(DATES_TEMPORAL_SHEET_PORT)
    private readonly datesTemporalSheetPort: DatesTemporalSheetPort,
    private readonly generateDatetime: GenerateDatetime,
  ) {}

  async deleteReservation(
    deleteReservation: DeleteReservation,
    options?: { skipAvailabilityRefresh?: boolean },
  ): Promise<string> {
    const { phone, date, time, name } = deleteReservation;

    const getIndexParams: GetIndexParams = {
      date: date!,
      time: time!,
      name: name!.toLowerCase(),
      phone: phone!,
    };

    try {
      const index = await this.datesSheetPort.getDateIndexByData(getIndexParams);

      if (index === -1) {
        this.logger.warn('Alguno de los datos no coincide con la reserva');
        return 'Algunos de los datos ingresados no coinciden con la reserva.';
      }

      const dates = await this.datesSheetPort.getDatetimeDates(date!, time!);

      if (dates.length === 1) {
        await this.datesSheetPort.deleteReservation(`${SHEETS_NAMES[0]}!C${index}:F${index}`);
      } else {
        await this.datesSheetPort.deleteRow(index, 0);
      }

      const availabilityFromReservations =
        await this.datesSheetPort.getAvailabilityFromReservations(date!, time!);

      const updateParams: UpdateParams = {
        reservations: availabilityFromReservations.reservations,
        available: availabilityFromReservations.available,
        date: date!,
        time: time!,
      };

      await this.datesSheetPort.updateAvailabilityFromReservations(updateParams);

      if (!options?.skipAvailabilityRefresh) {
        await this.datesSheetPort.refreshAvailabilityForDate(date!);
      }

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
      const deletedTemporalRows = await this.deleteExpiredTemporalRows();
      const retentionDays = this.getRetentionDays();
      const deleteTillDate = this.generateDatetime.createPastDay(retentionDays - 1);
      const oldestRegisteredDate = await this.datesSheetPort.getFirstRowValue(
        `${SHEETS_NAMES[1]}!A${this.rowStart}:A`,
      );

      if (oldestRegisteredDate === 'no hay valores') {
        this.logger.log('No hay filas antiguas para eliminar porque la agenda esta vacia.');
        return this.buildDeleteOldRowsMessage(
          'No hay filas antiguas para eliminar.',
          deletedTemporalRows,
        );
      }

      const oldestDate = parseDate(oldestRegisteredDate);
      const cutoffDate = parseDate(deleteTillDate);

      if (oldestDate >= cutoffDate) {
        this.logger.log(
          `No hay filas antiguas para eliminar. La agenda ya conserva ${retentionDays} dias hacia atras.`,
        );
        return this.buildDeleteOldRowsMessage(
          'No hay filas antiguas para eliminar.',
          deletedTemporalRows,
        );
      }

      const rowEndFirstSheet = await this.datesSheetPort.getDateIndexByDate(deleteTillDate, 0);

      if (rowEndFirstSheet === -1) {
        this.logger.warn('No se encontro la fecha de corte para la hoja de reservas');
        return this.buildDeleteOldRowsMessage(
          'No se encontro la fecha de corte.',
          deletedTemporalRows,
        );
      }

      await this.datesSheetPort.deleteOldRows(this.rowStart, rowEndFirstSheet, 0);

      this.logger.log(
        `Filas antiguas eliminadas correctamente para la hoja de reservas hasta ${deleteTillDate}`,
        DeleteReservationUseCase.name,
      );

      const rowEndSecondSheet = await this.datesSheetPort.getDateIndexByDate(deleteTillDate, 1);

      if (rowEndSecondSheet === -1) {
        this.logger.warn('No se encontro la fecha de corte para la hoja de disponibilidad');
        return this.buildDeleteOldRowsMessage(
          'No se encontro la fecha de corte.',
          deletedTemporalRows,
        );
      }

      await this.datesSheetPort.deleteOldRows(this.rowStart, rowEndSecondSheet, 1);

      this.logger.log(
        `Filas antiguas eliminadas correctamente para la hoja de disponibilidad hasta ${deleteTillDate}`,
        DeleteReservationUseCase.name,
      );

      const deletedClosedDays = await this.datesSheetPort.deleteClosedDaysBefore(deleteTillDate);

      if (deletedClosedDays > 0) {
        this.logger.log(
          `Dias cerrados antiguos eliminados correctamente. Registros borrados=${deletedClosedDays} hasta ${deleteTillDate}`,
          DeleteReservationUseCase.name,
        );
      } else {
        this.logger.log(
          `No hubo dias cerrados antiguos para eliminar hasta ${deleteTillDate}.`,
          DeleteReservationUseCase.name,
        );
      }

      return this.buildDeleteOldRowsMessage(
        `Se eliminaron las filas anteriores a ${deleteTillDate}.`,
        deletedTemporalRows,
      );
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

  private async deleteExpiredTemporalRows(): Promise<number> {
    const expirationWindowMs = 3 * 60 * 60 * 1000;
    const cutoffIso = new Date(Date.now() - expirationWindowMs).toISOString();
    const expiredRows = await this.datesTemporalSheetPort.findExpiredRows(cutoffIso);

    if (expiredRows.length === 0) {
      this.logger.log(`No hubo filas temporales expiradas para eliminar hasta ${cutoffIso}.`);
      return 0;
    }

    for (const row of [...expiredRows].sort((left, right) => right.rowIndex - left.rowIndex)) {
      await this.datesSheetPort.deleteRow(row.rowIndex, 2);
      this.logger.log(
        `Fila temporal expirada eliminada para waId ${row.waId} con estado ${row.status} y updatedAt ${row.updatedAt}`,
      );
    }

    return expiredRows.length;
  }

  private buildDeleteOldRowsMessage(baseMessage: string, deletedTemporalRows: number): string {
    if (deletedTemporalRows === 0) {
      return baseMessage;
    }

    return `${baseMessage} Ademas se eliminaron ${deletedTemporalRows} filas temporales expiradas.`;
  }
}
