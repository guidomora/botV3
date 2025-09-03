import { Injectable } from "@nestjs/common";
import { SHEETS_NAMES } from "src/constants";
import { GoogleSheetsService } from "src/google-sheets/service/google-sheets.service";
import { DeleteReservation, GetIndexParams, ReservationOperation, UpdateParams } from "src/lib"
import { Logger } from "@nestjs/common";

@Injectable()
export class DeleteReservationUseCase {
  private readonly logger = new Logger(DeleteReservationUseCase.name);

  constructor(
    private readonly googleSheetsService: GoogleSheetsService
  ) { }

  async deleteReservation(deleteReservation: DeleteReservation): Promise<string> {
    const { phone, date, time, name } = deleteReservation;

    const getIndexParams: GetIndexParams = {
      date: date!,
      time: time!,
      name: name!,
      phone: phone!
    }

    try {

      const index = await this.googleSheetsService.getDateIndexByData(getIndexParams)

      if (index === -1) {
        return 'No se encontro la fecha'
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

  async deleteOldRows(){

    const rowStart = 1;
    const rowEnd = 1;
    const sheetIndex = 0;

    
    try {
      await this.googleSheetsService.deleteOldRows(rowStart, rowEnd, sheetIndex);
    } catch (error) {
      this.logger.error(`Error al eliminar las filas antiguas`, error);
      throw error;
    }
  }
}