import { Injectable } from "@nestjs/common";
import { SHEETS_NAMES } from "src/constants";
import { GoogleSheetsService } from "src/modules/google-sheets/service/google-sheets.service";
import { DeleteReservation, GetIndexParams, ReservationOperation, UpdateParams } from "src/lib"
import { Logger } from "@nestjs/common";
import { GenerateDatetime } from "../dateTime-build/generate-datetime";

@Injectable()
export class DeleteReservationUseCase {
  private readonly logger = new Logger(DeleteReservationUseCase.name);

  constructor(
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly generateDatetime: GenerateDatetime
  ) { }

  async deleteReservation(deleteReservation: DeleteReservation): Promise<string> {
    const { phone, date, time, name } = deleteReservation;

    const getIndexParams: GetIndexParams = {
      date: date!,
      time: time!,
      name: name!,
      phone: phone!
    }
    console.log(date);

    try {

      const index = await this.googleSheetsService.getDateIndexByData(getIndexParams)

      if (index === -1) {
        this.logger.warn('Alguno de los datos no coincide con la reserva')
        return 'No se encontro la reserva'
      }

      const dates = await this.googleSheetsService.getDatetimeDates(date!, time!)

      if (dates.length === 1) {
        await this.googleSheetsService.deleteReservation(`${SHEETS_NAMES[0]}!C${index}:F${index}`)
      } else {
        await this.googleSheetsService.deleteRow(index, 0)
      }

      const availability = await this.googleSheetsService.getAvailability(date!, time!)

      const updateParams: UpdateParams = {
        reservations: availability.reservations,
        available: availability.available,
        date: date!,
        time: time!
      }

      await this.googleSheetsService.updateAvailability(ReservationOperation.SUBTRACT, updateParams)
      this.logger.log(`Reserva eliminada correctamente para el dia ${date} a las ${time} para ${phone}`, DeleteReservationUseCase.name)

      return 'Reserva eliminada correctamente'
    } catch (error) {
      this.logger.error(`Error al eliminar la reserva`, error);
      throw error;
    }
  }

  async deleteOldRows() {

    const rowStart = 4;

    try {

      const deleteTillDate = this.generateDatetime.createPastDay(5);

      const rowEndFirstSheet = await this.googleSheetsService.getDateIndexByDate(deleteTillDate, 0);

      if (rowEndFirstSheet === -1) {
        this.logger.warn('No se encontro la fecha para la hoja 1')
        return 'No se encontro la fecha'
      }

      await this.googleSheetsService.deleteOldRows(rowStart, rowEndFirstSheet, 0);

      this.logger.log(`Filas antiguas eliminadas correctamente para la hoja 0`, DeleteReservationUseCase.name)

      const rowEndSecondSheet = await this.googleSheetsService.getDateIndexByDate(deleteTillDate, 1);

      if (rowEndSecondSheet === -1) {
        this.logger.warn('No se encontro la fecha para la hoja 2')
        return 'No se encontro la fecha'
      }

      await this.googleSheetsService.deleteOldRows(rowStart, rowEndSecondSheet, 1);

      this.logger.log(`Filas antiguas eliminadas correctamente para la hoja 1`, DeleteReservationUseCase.name)
    } catch (error) {
      this.logger.error(`Error al eliminar las filas antiguas`, error);
      throw error;
    }
  }
}