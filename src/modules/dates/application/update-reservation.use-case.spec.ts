import { DatesSheetPort, StatusEnum } from 'src/lib';
import { UpdateReservationUseCase } from './update-reservation.use-case';
import { CreateReservationRowUseCase } from './create-reservation.use-case';
import { DeleteReservationUseCase } from './delete-reservation.use-case';
import { buildUpdateReservationMock } from '../test/builders/update-reservation.builder';
import {
  futureReservationDateLabelMock,
  nextReservationDateLabelMock,
  updateCurrentRowValuesMock,
} from '../test/mocks/sheets-data.mock';
import {
  createReservationRowUseCaseMock as buildCreateReservationRowUseCaseMock,
  deleteReservationUseCaseMock as buildDeleteReservationUseCaseMock,
  googleSheetsServiceMock as buildGoogleSheetsServiceMock,
} from '../test/mocks/dependency-mocks';

describe('UpdateReservationUseCase', () => {
  let useCase: UpdateReservationUseCase;

  const createReservationRowUseCaseMock = buildCreateReservationRowUseCaseMock();
  const deleteReservationUseCaseMock = buildDeleteReservationUseCaseMock();
  const googleSheetsServiceMock = buildGoogleSheetsServiceMock();

  beforeEach(() => {
    Object.values(createReservationRowUseCaseMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(deleteReservationUseCaseMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(googleSheetsServiceMock).forEach((mockFn) => mockFn.mockReset());

    process.env.MAX_PEOPLE_PER_RESERVATION = '12';
    process.env.LARGE_RESERVATION_CONTACT_NUMBER = '11-5555-0000';

    useCase = new UpdateReservationUseCase(
      googleSheetsServiceMock as unknown as DatesSheetPort,
      createReservationRowUseCaseMock as unknown as CreateReservationRowUseCase,
      deleteReservationUseCaseMock as unknown as DeleteReservationUseCase,
    );
  });

  afterEach(() => {
    delete process.env.MAX_PEOPLE_PER_RESERVATION;
    delete process.env.LARGE_RESERVATION_CONTACT_NUMBER;
  });

  it('should reject reservation update when original data is incomplete', async () => {
    await expect(
      useCase.updateReservation(buildUpdateReservationMock({ currentDate: '' })),
    ).resolves.toEqual({
      status: StatusEnum.MISSING_DATA_UPDATE,
      message: 'Faltan datos de la reserva original',
      error: true,
    });
  });

  it('should reject reservation update when original reservation is in the past', async () => {
    await expect(
      useCase.updateReservation(
        buildUpdateReservationMock({ currentDate: 'domingo 01 de marzo 2020 01/03/2020' }),
      ),
    ).resolves.toMatchObject({
      status: StatusEnum.DATE_ALREADY_PASSED,
      error: true,
    });
  });

  it('should reject reservation update when target reservation is in the past', async () => {
    await expect(
      useCase.updateReservation(
        buildUpdateReservationMock({
          newDate: 'domingo 01 de marzo 2020 01/03/2020',
          newTime: '21:00',
        }),
      ),
    ).resolves.toMatchObject({
      status: StatusEnum.DATE_ALREADY_PASSED,
      error: true,
    });
  });

  it('should return no date found when current reservation does not exist', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(-1);

    const result = await useCase.updateReservation(buildUpdateReservationMock());

    expect(result.status).toBe(StatusEnum.NO_DATE_FOUND);
    expect(result.error).toBe(true);
    expect(result.message).toContain('reserva con los datos proporcionados');
  });

  it('should return duplicate same day response when phone already has another booking that day', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(true);

    await expect(useCase.updateReservation(buildUpdateReservationMock())).resolves.toMatchObject({
      status: StatusEnum.DUPLICATE_RESERVATION_SAME_DAY,
      error: true,
    });
  });

  it('should reject update when resulting quantity becomes a large reservation', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getRowValues.mockResolvedValue(updateCurrentRowValuesMock);

    await expect(
      useCase.updateReservation(buildUpdateReservationMock({ newQuantity: '13' })),
    ).resolves.toMatchObject({
      status: StatusEnum.RESERVATION_ERROR,
      error: true,
    });
  });

  it('should reject same-slot updates when there is no remaining availability', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getRowValues.mockResolvedValue(updateCurrentRowValuesMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: false,
      reservations: 42,
      available: 0,
    });

    const result = await useCase.updateReservation(
      buildUpdateReservationMock({ newName: 'Guido M' }),
    );

    expect(result.status).toBe(StatusEnum.NO_AVAILABILITY);
    expect(result.error).toBe(true);
    expect(result.message).toContain('No hay lugar para esa cantidad de personas');
  });

  it('should update reservation in place when date and time do not change', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getRowValues.mockResolvedValue(updateCurrentRowValuesMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: true,
      reservations: 10,
      available: 32,
    });

    await expect(
      useCase.updateReservation(
        buildUpdateReservationMock({ newName: 'Guido Modificado', newQuantity: '5' }),
      ),
    ).resolves.toMatchObject({
      status: StatusEnum.SUCCESS,
      error: false,
    });

    expect(googleSheetsServiceMock.createReservation).toHaveBeenCalledWith('Reservas!C27:F27', {
      customerData: {
        name: 'guido modificado',
        phone: '54-9-1154916243',
        quantity: 5,
      },
    });
    expect(googleSheetsServiceMock.refreshAvailabilityForDate).toHaveBeenCalledWith(
      futureReservationDateLabelMock,
    );
  });

  it('should use current row quantity when newQuantity is not numeric', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getRowValues.mockResolvedValue(updateCurrentRowValuesMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: true,
      reservations: 10,
      available: 32,
    });

    await expect(
      useCase.updateReservation(
        buildUpdateReservationMock({ newName: 'Guido Fallback', newQuantity: 'muchas' }),
      ),
    ).resolves.toMatchObject({
      status: StatusEnum.SUCCESS,
      error: false,
    });

    expect(googleSheetsServiceMock.createReservation).toHaveBeenCalledWith('Reservas!C27:F27', {
      customerData: {
        name: 'guido fallback',
        phone: '54-9-1154916243',
        quantity: 4,
      },
    });
  });

  it('should reject moved reservation when target slot has no availability', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getRowValues.mockResolvedValue(updateCurrentRowValuesMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: false,
      reservations: 42,
      available: 0,
    });

    const result = await useCase.updateReservation(
      buildUpdateReservationMock({ newTime: '21:00' }),
    );

    expect(result.status).toBe(StatusEnum.NO_AVAILABILITY);
    expect(result.error).toBe(true);
    expect(result.message).toContain('en el nuevo horario');
  });

  it('should return generic error when moving reservation and creation fails', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getRowValues.mockResolvedValue(updateCurrentRowValuesMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: true,
      reservations: 10,
      available: 32,
    });
    createReservationRowUseCaseMock.createReservation.mockResolvedValue({
      error: true,
      status: StatusEnum.RESERVATION_ERROR,
    });

    const result = await useCase.updateReservation(
      buildUpdateReservationMock({
        newDate: nextReservationDateLabelMock,
        newTime: '21:00',
      }),
    );

    expect(result.status).toBe(StatusEnum.RESERVATION_ERROR);
    expect(result.error).toBe(true);
    expect(result.message).toContain('Hubo un problema al procesar la reserva');
  });

  it('should move reservation to another date and refresh both dates', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getRowValues.mockResolvedValue(updateCurrentRowValuesMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: true,
      reservations: 10,
      available: 32,
    });
    createReservationRowUseCaseMock.createReservation.mockResolvedValue({
      error: false,
      status: StatusEnum.SUCCESS,
    });
    deleteReservationUseCaseMock.deleteReservation.mockResolvedValue(
      'Su reserva ha sido cancelada correctamente.',
    );

    await expect(
      useCase.updateReservation(
        buildUpdateReservationMock({
          newDate: nextReservationDateLabelMock,
          newTime: '21:00',
          newName: 'guido nuevo',
          newQuantity: '5',
        }),
      ),
    ).resolves.toMatchObject({
      status: StatusEnum.SUCCESS,
      error: false,
    });

    expect(createReservationRowUseCaseMock.createReservation).toHaveBeenCalledWith({
      date: nextReservationDateLabelMock,
      time: '21:00',
      name: 'guido nuevo',
      phone: '54-9-1154916243',
      quantity: 5,
      excludedRowIndex: 27,
    });
    expect(deleteReservationUseCaseMock.deleteReservation).toHaveBeenCalledWith({
      date: futureReservationDateLabelMock,
      time: '20:00',
      name: 'guido',
      phone: '54-9-1154916243',
    });
    expect(googleSheetsServiceMock.refreshAvailabilityForDate).toHaveBeenNthCalledWith(
      1,
      futureReservationDateLabelMock,
    );
    expect(googleSheetsServiceMock.refreshAvailabilityForDate).toHaveBeenNthCalledWith(
      2,
      nextReservationDateLabelMock,
    );
  });

  it('should move reservation within the same date and refresh availability once', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getRowValues.mockResolvedValue(updateCurrentRowValuesMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: true,
      reservations: 10,
      available: 32,
    });
    createReservationRowUseCaseMock.createReservation.mockResolvedValue({
      error: false,
      status: StatusEnum.SUCCESS,
    });
    deleteReservationUseCaseMock.deleteReservation.mockResolvedValue(
      'Su reserva ha sido cancelada correctamente.',
    );

    await expect(
      useCase.updateReservation(
        buildUpdateReservationMock({
          newTime: '21:00',
          newName: 'guido noche',
        }),
      ),
    ).resolves.toMatchObject({
      status: StatusEnum.SUCCESS,
      error: false,
    });

    expect(googleSheetsServiceMock.refreshAvailabilityForDate).toHaveBeenCalledTimes(1);
    expect(googleSheetsServiceMock.refreshAvailabilityForDate).toHaveBeenCalledWith(
      futureReservationDateLabelMock,
    );
    expect(createReservationRowUseCaseMock.createReservation).toHaveBeenCalledWith({
      date: futureReservationDateLabelMock,
      time: '21:00',
      name: 'guido noche',
      phone: '54-9-1154916243',
      quantity: 4,
      excludedRowIndex: 27,
    });
  });

  it('should use normalized name to find the current reservation', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(-1);

    await useCase.updateReservation(buildUpdateReservationMock({ currentName: 'Guido' }));

    expect(googleSheetsServiceMock.getDateIndexByData).toHaveBeenCalledWith({
      date: futureReservationDateLabelMock,
      time: '20:00',
      name: 'guido',
      phone: '54-9-1154916243',
    });
  });
});
