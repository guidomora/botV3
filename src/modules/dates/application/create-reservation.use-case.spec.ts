import { StatusEnum } from 'src/lib';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { CreateReservationRowUseCase } from './create-reservation.use-case';
import { createReservationRequestMock } from '../test/mocks/reservation-scenarios.mock';
import {
  existingReservationDateLabelMock,
  minimalSlotRowValuesMock,
  occupiedSlotRowValuesMock,
} from '../test/mocks/sheets-data.mock';
import { googleSheetsServiceMock as buildGoogleSheetsServiceMock } from '../test/mocks/dependency-mocks';

describe('CreateReservationRowUseCase', () => {
  let useCase: CreateReservationRowUseCase;

  const googleSheetsServiceMock = buildGoogleSheetsServiceMock();

  beforeEach(() => {
    Object.values(googleSheetsServiceMock).forEach((mockFn) => mockFn.mockReset());
    process.env.MAX_PEOPLE_PER_RESERVATION = '12';
    process.env.LARGE_RESERVATION_CONTACT_NUMBER = '11-5555-0000';
    useCase = new CreateReservationRowUseCase(
      googleSheetsServiceMock as unknown as GoogleSheetsService,
    );
  });

  afterEach(() => {
    delete process.env.MAX_PEOPLE_PER_RESERVATION;
    delete process.env.LARGE_RESERVATION_CONTACT_NUMBER;
  });

  it('should create a reservation in place when slot row is empty', async () => {
    googleSheetsServiceMock.getDate.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: true,
      reservations: 8,
      available: 34,
    });
    googleSheetsServiceMock.getRowValues.mockResolvedValue(minimalSlotRowValuesMock);

    const result = await useCase.createReservation(createReservationRequestMock);

    expect(result).toEqual({
      error: false,
      message:
        'Reserva creada correctamente para el dia domingo 01 de marzo 2030 01/03/2030 a las 20:00 para guido y 4 personas',
      status: StatusEnum.SUCCESS,
    });
    expect(googleSheetsServiceMock.createReservation).toHaveBeenCalledWith('Reservas!C27:F27', {
      customerData: {
        name: 'guido',
        phone: '54-9-1154916243',
        quantity: 4,
      },
    });
  });

  it('should create a new row when the current slot is already occupied', async () => {
    googleSheetsServiceMock.getDate.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: true,
      reservations: 8,
      available: 34,
    });
    googleSheetsServiceMock.getRowValues.mockResolvedValue(occupiedSlotRowValuesMock);
    googleSheetsServiceMock.insertRow.mockResolvedValue(28);

    const result = await useCase.createReservation(createReservationRequestMock);

    expect(result.status).toBe(StatusEnum.SUCCESS);
    expect(googleSheetsServiceMock.insertRow).toHaveBeenCalledWith('Reservas!A27:F27', 27);
    expect(googleSheetsServiceMock.createReservation).toHaveBeenCalledWith('Reservas!A28:F28', {
      customerData: {
        ...createReservationRequestMock,
        date: existingReservationDateLabelMock,
        time: '22:00',
      },
    });
  });

  it('should reject reservations in the past', async () => {
    const result = await useCase.createReservation({
      ...createReservationRequestMock,
      date: 'domingo 01 de marzo 2020 01/03/2020',
    });

    expect(result.status).toBe(StatusEnum.DATE_ALREADY_PASSED);
    expect(googleSheetsServiceMock.getDate).not.toHaveBeenCalled();
  });

  it('should return no date found when slot does not exist', async () => {
    googleSheetsServiceMock.getDate.mockResolvedValue(-1);

    const result = await useCase.createReservation(createReservationRequestMock);

    expect(result).toEqual({
      error: true,
      message:
        'La fecha u horario seleccionado no esta disponible. Por lo tanto la reserva no se pudo realizar.',
      status: StatusEnum.NO_DATE_FOUND,
    });
  });

  it('should return duplicate reservation response when phone already has same day booking', async () => {
    googleSheetsServiceMock.getDate.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(true);

    const result = await useCase.createReservation(createReservationRequestMock);

    expect(result.status).toBe(StatusEnum.DUPLICATE_RESERVATION_SAME_DAY);
  });

  it('should reject large reservations that require manual handling', async () => {
    googleSheetsServiceMock.getDate.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: true,
      reservations: 8,
      available: 34,
    });

    const result = await useCase.createReservation({
      ...createReservationRequestMock,
      quantity: 13,
    });

    expect(result.status).toBe(StatusEnum.RESERVATION_ERROR);
    expect(result.message).toContain('11-5555-0000');
  });

  it('should return no availability when capacity is exhausted', async () => {
    googleSheetsServiceMock.getDate.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: false,
      reservations: 42,
      available: 0,
    });

    const result = await useCase.createReservation(createReservationRequestMock);

    expect(result.status).toBe(StatusEnum.NO_AVAILABILITY);
    expect(result.error).toBe(true);
    expect(result.message).toContain('No hay lugar para esa cantidad de personas');
  });

  it('should rethrow unexpected provider errors', async () => {
    googleSheetsServiceMock.getDate.mockRejectedValue(new Error('sheets-failed'));

    await expect(useCase.createReservation(createReservationRequestMock)).rejects.toThrow(
      'sheets-failed',
    );
  });

  it('should create reservation and row helper', async () => {
    googleSheetsServiceMock.insertRow.mockResolvedValue(30);

    await useCase.createReservationAndRow(29, createReservationRequestMock);

    expect(googleSheetsServiceMock.insertRow).toHaveBeenCalledWith('Reservas!A29:F29', 29);
    expect(googleSheetsServiceMock.createReservation).toHaveBeenCalledWith('Reservas!A30:F30', {
      customerData: createReservationRequestMock,
    });
  });
});
