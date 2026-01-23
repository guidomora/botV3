import { Injectable } from "@nestjs/common";
import { SHEETS_NAMES } from "src/constants";
import { GoogleSheetsService } from "src/modules/google-sheets/service/google-sheets.service";
import { CreateReservationType, ReservationOperation, ServiceResponse, StatusEnum, UpdateParams } from "src/lib";
import { Logger } from "@nestjs/common";

@Injectable()
export class CreateReservationRowUseCase {
    private readonly logger = new Logger(CreateReservationRowUseCase.name);
    constructor(
        private readonly googleSheetsService: GoogleSheetsService,
    ) { }

    async createReservation(createReservation: CreateReservationType):Promise<ServiceResponse> {
        const { date, time, name, phone, quantity } = createReservation;
    
        try {
          const index = await this.googleSheetsService.getDate(date!, time!)
    
          if (index === -1) {
            this.logger.warn('No se encontro la fecha')
            return {
              error: true,
              message: 'La fecha u horario seleccionado no esta disponible. Por lo tanto la reserva no se pudo realizar.',
              status: StatusEnum.NO_DATE_FOUND
            }
          }
    
          const availability = await this.googleSheetsService.getAvailabilityFromReservations(date!, time!)
    
          if (!availability.isAvailable) {
            this.logger.warn('No hay disponibilidad para esa fecha y horario')
            return {
              error: true,
              message: 'No hay disponibilidad para esa fecha y horario. Por lo tanto la reserva no se pudo realizar.',
              status: StatusEnum.NO_AVAILABILITY
            }
          }
    
          const currentRow = await this.googleSheetsService.getRowValues(`${SHEETS_NAMES[0]}!A${index}:F${index}`)
    
    
          if (currentRow[2] != undefined && currentRow[3] != undefined && currentRow[4] != undefined && currentRow[5] != undefined) {
            const newRowData = {
              date: String(currentRow[0]),
              time: String(currentRow[1]),
              name,
              phone,
              quantity
            }
    
            await this.createReservationAndRow(index, newRowData)
          } else {
            const customerData = { name, phone, quantity }
            await this.googleSheetsService.createReservation(`${SHEETS_NAMES[0]}!C${index}:F${index}`, { customerData })
          }
    
          const updateParams: UpdateParams = {
            reservations: availability.reservations + 1,
            available: availability.available,
            date: date!,
            time: time!
          }
    
          await this.googleSheetsService.updateAvailabilityFromReservations(updateParams)
    
          return {
            error: false,
            message: `Reserva creada correctamente para el dia ${date} a las ${time} para ${name} y ${quantity} personas`,
            status: StatusEnum.SUCCESS
          }
        } catch (error) {
          this.logger.error(`Error al agregar la reserva`, error);
          throw error;
        }
      }

    async createReservationAndRow(index: number, newRowData:CreateReservationType):Promise<void> {
        const newRowIndex = await this.googleSheetsService.insertRow(`${SHEETS_NAMES[0]}!A${index}:F${index}`, index)

        await this.googleSheetsService.createReservation(`${SHEETS_NAMES[0]}!A${newRowIndex}:F${newRowIndex}`, { customerData: newRowData })
    }
}