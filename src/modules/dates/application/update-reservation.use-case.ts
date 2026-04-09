import { Inject, Injectable, Logger } from '@nestjs/common';
import { SHEETS_NAMES } from 'src/constants';
import {
  CreateReservationType,
  DatesSheetPort,
  DeleteReservation,
  formatPhoneNumber,
  GetIndexParams,
  getLargeReservationValidation,
  ServiceResponse,
  StatusEnum,
  UpdateReservationContextType,
  UpdateReservationResolvedType,
  UpdateReservationType,
} from 'src/lib';
import { getDuplicateSameDayReservationResponse } from '../utils';
import { parseDateTime } from '../utils/parseDate';
import { CreateReservationRowUseCase } from './create-reservation.use-case';
import { DeleteReservationUseCase } from './delete-reservation.use-case';
import { DATES_SHEET_PORT } from '../dates.tokens';

@Injectable()
export class UpdateReservationUseCase {
  private readonly logger = new Logger(UpdateReservationUseCase.name);

  constructor(
    @Inject(DATES_SHEET_PORT) private readonly datesSheetPort: DatesSheetPort,
    private readonly createReservationRowUseCase: CreateReservationRowUseCase,
    private readonly deleteReservationUseCase: DeleteReservationUseCase,
  ) {}

  async updateReservation(updateReservation: UpdateReservationType): Promise<ServiceResponse> {
    const requiredDataValidation = this.validateRequiredOriginalData(updateReservation);
    if (requiredDataValidation) {
      return requiredDataValidation;
    }

    const context = this.buildUpdateContext(updateReservation);
    const currentReservationDateValidation = this.validateCurrentReservationIsNotPast(context);
    if (currentReservationDateValidation) {
      return currentReservationDateValidation;
    }

    const targetReservationDateValidation = this.validateTargetReservationIsNotPast(context);
    if (targetReservationDateValidation) {
      return targetReservationDateValidation;
    }

    const currentReservationIndex = await this.findCurrentReservationIndex(context);
    if (currentReservationIndex === -1) {
      return {
        status: StatusEnum.NO_DATE_FOUND,
        message: 'No se encontró la reserva con los datos proporcionados.',
        error: true,
      };
    }

    const duplicateReservationValidation = await this.validateNoSameDayDuplicate(
      context,
      currentReservationIndex,
    );
    if (duplicateReservationValidation) {
      return duplicateReservationValidation;
    }

    const resolvedReservation = await this.resolveReservationData(context, currentReservationIndex);
    const largeReservationValidation = this.validateLargeReservation(
      resolvedReservation.resolvedQuantity,
    );
    if (largeReservationValidation) {
      return largeReservationValidation;
    }

    const availability = await this.datesSheetPort.getAvailabilityFromReservations(
      context.targetDate,
      context.targetTime,
      resolvedReservation.resolvedQuantity,
      currentReservationIndex,
    );

    if (
      context.targetReservationDateTime.getTime() === context.currentReservationDateTime.getTime()
    ) {
      return this.updateReservationInPlace(context, resolvedReservation, availability.isAvailable);
    }

    return this.moveReservation(context, resolvedReservation, availability.isAvailable);
  }

  private validateRequiredOriginalData(
    updateReservation: UpdateReservationType,
  ): ServiceResponse | null {
    const { currentDate, currentTime, currentName, phone } = updateReservation;

    if (!currentDate || !currentTime || !currentName || !phone) {
      return {
        status: StatusEnum.MISSING_DATA_UPDATE,
        message: 'Faltan datos de la reserva original',
        error: true,
      };
    }

    return null;
  }

  private buildUpdateContext(
    updateReservation: UpdateReservationType,
  ): UpdateReservationContextType {
    const { currentDate, currentTime, newDate, newTime, currentName, phone, newQuantity, newName } =
      updateReservation;

    const formattedPhone = formatPhoneNumber(phone) ?? phone!;
    const targetDate = newDate ?? currentDate!;
    const targetTime = newTime ?? currentTime!;
    const targetName = newName ?? currentName!;

    return {
      currentDate: currentDate!,
      currentTime: currentTime!,
      currentName: currentName!,
      phone: phone!,
      newQuantity,
      formattedPhone,
      targetDate,
      targetTime,
      targetName,
      currentReservationDateTime: parseDateTime(currentDate!, currentTime!),
      targetReservationDateTime: parseDateTime(targetDate, targetTime),
    };
  }

  private validateCurrentReservationIsNotPast(
    context: UpdateReservationContextType,
  ): ServiceResponse | null {
    if (context.currentReservationDateTime.getTime() < Date.now()) {
      this.logger.warn(
        'La fecha u horario de la reserva ya pasaron. No se puede modificar una reserva pasada.',
      );
      return {
        status: StatusEnum.DATE_ALREADY_PASSED,
        message:
          'La fecha u horario de la reserva ya pasaron. No se puede modificar una reserva pasada. Se puede crear una reserva con los datos solicitados',
        error: true,
      };
    }

    return null;
  }

  private validateTargetReservationIsNotPast(
    context: UpdateReservationContextType,
  ): ServiceResponse | null {
    if (context.targetReservationDateTime.getTime() < Date.now()) {
      this.logger.warn(
        'La nueva fecha u horario ya pasaron. Por favor elegí otra fecha u horario.',
      );
      return {
        status: StatusEnum.DATE_ALREADY_PASSED,
        message: 'La nueva fecha u horario ya pasaron. Por favor elegí otra fecha u horario.',
        error: true,
      };
    }

    return null;
  }

  private async findCurrentReservationIndex(
    context: UpdateReservationContextType,
  ): Promise<number> {
    const searchIndexObject: GetIndexParams = {
      date: context.currentDate,
      time: context.currentTime,
      name: context.currentName.toLowerCase(),
      phone: context.formattedPhone,
    };

    return this.datesSheetPort.getDateIndexByData(searchIndexObject);
  }

  private async validateNoSameDayDuplicate(
    context: UpdateReservationContextType,
    currentReservationIndex: number,
  ): Promise<ServiceResponse | null> {
    const hasReservationSameDay = await this.datesSheetPort.hasReservationByDateAndPhone(
      context.targetDate,
      context.formattedPhone,
      currentReservationIndex,
    );

    if (hasReservationSameDay) {
      return getDuplicateSameDayReservationResponse();
    }

    return null;
  }

  private async resolveReservationData(
    context: UpdateReservationContextType,
    currentReservationIndex: number,
  ): Promise<UpdateReservationResolvedType> {
    const currentRow = await this.datesSheetPort.getRowValues(
      `${SHEETS_NAMES[0]}!A${currentReservationIndex}:F${currentReservationIndex}`,
    );

    const quantity = Number(this.parseCellValue(currentRow?.[5])) || 1;
    const resolvedQuantity =
      context.newQuantity && !Number.isNaN(Number(context.newQuantity))
        ? Number(context.newQuantity)
        : quantity;

    return {
      currentReservationIndex,
      resolvedQuantity,
      createRange: `${SHEETS_NAMES[0]}!C${currentReservationIndex}:F${currentReservationIndex}`,
    };
  }

  private parseCellValue(value: unknown): unknown {
    if (!Array.isArray(value)) {
      return value;
    }

    const [firstValue] = value as unknown[];
    return firstValue;
  }

  private validateLargeReservation(resolvedQuantity: number): ServiceResponse | null {
    const largeReservationValidation = getLargeReservationValidation(resolvedQuantity);
    if (largeReservationValidation.isLargeReservation) {
      const contactInstruction = largeReservationValidation.contactNumber
        ? `Por favor escribinos o llamanos al ${largeReservationValidation.contactNumber} para ayudarte con la modificación, ya que este tipo de reserva requiere atención directa.`
        : 'Por favor escribinos o llamanos para ayudarte con la modificación, ya que este tipo de reserva requiere atención directa.';

      return {
        status: StatusEnum.RESERVATION_ERROR,
        message: `Para reservas de más de ${largeReservationValidation.maxPeoplePerReservation} personas necesitamos gestionarlo por atención directa. ${contactInstruction}`,
        error: true,
      };
    }

    return null;
  }

  private async updateReservationInPlace(
    context: UpdateReservationContextType,
    resolvedReservation: UpdateReservationResolvedType,
    isAvailable: boolean,
  ): Promise<ServiceResponse> {
    if (!isAvailable) {
      return {
        status: StatusEnum.NO_AVAILABILITY,
        message:
          'No hay lugar para esa cantidad de personas en ese horario. Probá con una hora cercana y te ayudamos a encontrar lugar.',
        error: true,
      };
    }

    await this.datesSheetPort.createReservation(resolvedReservation.createRange, {
      customerData: {
        name: context.targetName.toLowerCase(),
        phone: context.formattedPhone,
        quantity: resolvedReservation.resolvedQuantity,
      },
    });

    await this.datesSheetPort.refreshAvailabilityForDate(context.currentDate);

    return {
      status: StatusEnum.SUCCESS,
      message: `Tu reserva a nombre de ${context.currentName} se actualizó a nombre de ${context.targetName} para ${resolvedReservation.resolvedQuantity} personas el ${context.currentDate} a las ${context.currentTime}.
        Muchas gracias!`,
      error: false,
    };
  }

  private async moveReservation(
    context: UpdateReservationContextType,
    resolvedReservation: UpdateReservationResolvedType,
    isAvailable: boolean,
  ): Promise<ServiceResponse> {
    if (!isAvailable) {
      return {
        status: StatusEnum.NO_AVAILABILITY,
        message:
          'No hay lugar para esa cantidad de personas en el nuevo horario. Probá con una hora cercana y te ayudamos a encontrar lugar.',
        error: true,
      };
    }

    const createObject: CreateReservationType = {
      date: context.targetDate,
      time: context.targetTime,
      name: context.targetName.toLowerCase(),
      phone: context.formattedPhone,
      quantity: resolvedReservation.resolvedQuantity,
      excludedRowIndex: resolvedReservation.currentReservationIndex,
    };

    const creationResult = await this.createReservationRowUseCase.createReservation(createObject);

    if (creationResult.error) {
      return {
        status: StatusEnum.RESERVATION_ERROR,
        message: 'Hubo un problema al procesar la reserva, por favor intentá nuevamente.',
        error: true,
      };
    }

    const deleteObject: DeleteReservation = {
      date: context.currentDate,
      time: context.currentTime,
      name: context.currentName,
      phone: context.formattedPhone,
    };

    await this.deleteReservationUseCase.deleteReservation(deleteObject);

    await this.datesSheetPort.refreshAvailabilityForDate(context.currentDate);
    if (context.targetDate !== context.currentDate) {
      await this.datesSheetPort.refreshAvailabilityForDate(context.targetDate);
    }

    return {
      status: StatusEnum.SUCCESS,
      message: `Tu reserva a nombre de ${context.currentName} se movió del ${context.currentDate} a las ${context.currentTime} al ${context.targetDate} a las ${context.targetTime} para ${resolvedReservation.resolvedQuantity} personas a nombre de ${context.targetName}.
      Muchas gracias!`,
      error: false,
    };
  }
}
