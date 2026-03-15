import { StatusEnum, TemporalStatusEnum } from 'src/lib';
import {
  CreateDayUseCase,
  CreateReservationRowUseCase,
  DeleteReservationUseCase,
} from '../application';
import { DatesService } from './dates.service';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { GoogleTemporalSheetsService } from 'src/modules/google-sheets/service/google-temporal-sheet.service';
import { buildUpdateReservationMock } from '../test/builders/update-reservation.builder';
import {
  deleteReservationRequestMock,
  temporalCompletedRowMock,
  temporalCompletedSnapshotMock,
  temporalInProgressRowMock,
} from '../test/mocks/reservation-scenarios.mock';
import {
  availabilityRowsMock,
  existingReservationDateLabelMock,
  futureReservationDateLabelMock,
  nextReservationDateLabelMock,
  updateCurrentRowValuesMock,
} from '../test/mocks/sheets-data.mock';
import {
  createDayUseCaseMock as buildCreateDayUseCaseMock,
  createReservationRowUseCaseMock as buildCreateReservationRowUseCaseMock,
  deleteReservationUseCaseMock as buildDeleteReservationUseCaseMock,
  googleSheetsServiceMock as buildGoogleSheetsServiceMock,
  googleTemporalSheetsServiceMock as buildGoogleTemporalSheetsServiceMock,
} from '../test/mocks/dependency-mocks';

describe('DatesService', () => {
  let service: DatesService;

  const createDayUseCaseMock = buildCreateDayUseCaseMock();
  const createReservationRowUseCaseMock = buildCreateReservationRowUseCaseMock();
  const deleteReservationUseCaseMock = buildDeleteReservationUseCaseMock();
  const googleSheetsServiceMock = buildGoogleSheetsServiceMock();
  const googleTemporalSheetsServiceMock = buildGoogleTemporalSheetsServiceMock();

  beforeEach(() => {
    Object.values(createDayUseCaseMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(createReservationRowUseCaseMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(deleteReservationUseCaseMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(googleSheetsServiceMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(googleTemporalSheetsServiceMock).forEach((mockFn) => mockFn.mockReset());

    process.env.MAX_PEOPLE_PER_RESERVATION = '12';
    process.env.LARGE_RESERVATION_CONTACT_NUMBER = '11-5555-0000';
    process.env.SLOT_INTERVAL_MINUTES = '60';

    service = new DatesService(
      createDayUseCaseMock as unknown as CreateDayUseCase,
      createReservationRowUseCaseMock as unknown as CreateReservationRowUseCase,
      deleteReservationUseCaseMock as unknown as DeleteReservationUseCase,
      googleSheetsServiceMock as unknown as GoogleSheetsService,
      googleTemporalSheetsServiceMock as unknown as GoogleTemporalSheetsService,
    );
  });

  afterEach(() => {
    delete process.env.MAX_PEOPLE_PER_RESERVATION;
    delete process.env.LARGE_RESERVATION_CONTACT_NUMBER;
    delete process.env.SLOT_INTERVAL_MINUTES;
  });

  it('should proxy createDate/createNextDate/createXDates', async () => {
    createDayUseCaseMock.createDate.mockResolvedValue('date-created');
    createDayUseCaseMock.createNextDate.mockResolvedValue('next-date-created');
    createDayUseCaseMock.createXDates.mockResolvedValue('x-dates-created');

    await expect(service.createDate()).resolves.toBe('date-created');
    await expect(service.createNextDate()).resolves.toBe('next-date-created');
    await expect(service.createXDates(3)).resolves.toBe('x-dates-created');
  });

  it('should create reservation from temporal data when snapshot is completed', async () => {
    googleTemporalSheetsServiceMock.addMissingField.mockResolvedValue(temporalCompletedRowMock);
    createReservationRowUseCaseMock.createReservation.mockResolvedValue({
      error: false,
      status: StatusEnum.SUCCESS,
      message: 'created',
    });

    const result = await service.createReservationWithMultipleMessages({
      waId: '5491154916243',
      values: temporalCompletedSnapshotMock,
    });

    expect(createReservationRowUseCaseMock.createReservation).toHaveBeenCalledWith({
      date: futureReservationDateLabelMock,
      time: '20:00',
      name: 'guido',
      phone: '54-9-1154916243',
      quantity: 4,
    });
    expect(googleSheetsServiceMock.deleteRow).toHaveBeenCalledWith(9, 2);
    expect(result).toEqual({
      status: TemporalStatusEnum.COMPLETED,
      missingFields: [],
      reservationData: temporalCompletedSnapshotMock,
    });
  });

  it('should keep temporal conversation in progress when final reservation date already passed', async () => {
    googleTemporalSheetsServiceMock.addMissingField.mockResolvedValue(temporalCompletedRowMock);
    createReservationRowUseCaseMock.createReservation.mockResolvedValue({
      error: true,
      status: StatusEnum.DATE_ALREADY_PASSED,
      message: 'fecha pasada',
    });

    await expect(
      service.createReservationWithMultipleMessages({
        waId: '5491154916243',
        values: temporalCompletedSnapshotMock,
      }),
    ).resolves.toEqual({
      status: TemporalStatusEnum.IN_PROGRESS,
      missingFields: ['date', 'time'],
      reservationData: temporalCompletedSnapshotMock,
      message: 'fecha pasada',
      errorStatus: StatusEnum.DATE_ALREADY_PASSED,
    });
  });

  it('should fail temporal creation when reservation use case returns another error', async () => {
    googleTemporalSheetsServiceMock.addMissingField.mockResolvedValue({
      ...temporalCompletedRowMock,
      missingFields: ['service'],
    });
    createReservationRowUseCaseMock.createReservation.mockResolvedValue({
      error: true,
      status: StatusEnum.NO_AVAILABILITY,
      message: 'sin lugar',
    });

    await expect(
      service.createReservationWithMultipleMessages({
        waId: '5491154916243',
        values: temporalCompletedSnapshotMock,
      }),
    ).resolves.toEqual({
      status: TemporalStatusEnum.FAILED,
      missingFields: ['service'],
      reservationData: temporalCompletedSnapshotMock,
      message: 'sin lugar',
      errorStatus: StatusEnum.NO_AVAILABILITY,
    });
  });

  it('should return temporal snapshot as-is when data is still incomplete', async () => {
    googleTemporalSheetsServiceMock.addMissingField.mockResolvedValue(temporalInProgressRowMock);

    await expect(
      service.createReservationWithMultipleMessages({
        waId: '5491154916243',
        values: { date: futureReservationDateLabelMock },
      }),
    ).resolves.toEqual({
      status: TemporalStatusEnum.IN_PROGRESS,
      missingFields: ['time'],
      reservationData: temporalInProgressRowMock.snapshot,
    });
  });

  it('should delete incomplete temporal reservation by waId when it exists', async () => {
    googleTemporalSheetsServiceMock.findTemporalRowIndexByWaId.mockResolvedValue(11);

    await expect(service.deleteIncompleteTemporalReservationByWaId('5491154916243')).resolves.toBe(
      true,
    );
    expect(googleSheetsServiceMock.deleteRow).toHaveBeenCalledWith(11, 2);
  });

  it('should skip deletion when temporal reservation does not exist', async () => {
    googleTemporalSheetsServiceMock.findTemporalRowIndexByWaId.mockResolvedValue(-1);

    await expect(service.deleteIncompleteTemporalReservationByWaId('5491154916243')).resolves.toBe(
      false,
    );
  });

  it('should proxy deleteReservation and deleteOldRows', async () => {
    deleteReservationUseCaseMock.deleteReservation.mockResolvedValue('deleted');
    deleteReservationUseCaseMock.deleteOldRows.mockResolvedValue('cleaned');

    await expect(service.deleteReservation(deleteReservationRequestMock)).resolves.toBe('deleted');
    await expect(service.deleteOldRows()).resolves.toBe('cleaned');
  });

  it('should format day availability from availability sheet rows', async () => {
    googleSheetsServiceMock.getDayAvailability.mockResolvedValue(availabilityRowsMock.slice(0, 2));

    await expect(service.getDayAvailability(futureReservationDateLabelMock)).resolves.toEqual({
      date_label: futureReservationDateLabelMock,
      columns: ['time', 'available_tables'],
      slots: [
        { time: '16:00', available_tables: 42 },
        { time: '17:00', available_tables: 40 },
      ],
      summary: { first_time: '16:00', last_time: '17:00' },
    });
  });

  it('should return exact time availability when requested slot exists', async () => {
    googleSheetsServiceMock.getDayAvailability.mockResolvedValue(availabilityRowsMock);

    await expect(
      service.getDayAndTimeAvailability(futureReservationDateLabelMock, '17:00'),
    ).resolves.toEqual({
      date_label: futureReservationDateLabelMock,
      columns: ['time', 'available_tables'],
      slots: [{ time: '17:00', available_tables: 40 }],
      summary: { first_time: '17:00', last_time: '17:00' },
    });
  });

  it('should search reservation index using normalized name', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);

    await expect(
      service.getReservationIndexByData(
        existingReservationDateLabelMock,
        '22:00',
        'Guido',
        '54-9-1154916243',
      ),
    ).resolves.toBe(27);

    expect(googleSheetsServiceMock.getDateIndexByData).toHaveBeenCalledWith({
      date: existingReservationDateLabelMock,
      time: '22:00',
      name: 'guido',
      phone: '54-9-1154916243',
    });
  });

  it('should reject reservation update when original data is incomplete', async () => {
    await expect(
      service.updateReservation(buildUpdateReservationMock({ currentDate: '' })),
    ).resolves.toEqual({
      status: StatusEnum.MISSING_DATA_UPDATE,
      message: 'Faltan datos de la reserva original',
      error: true,
    });
  });

  it('should reject reservation update when original reservation is in the past', async () => {
    await expect(
      service.updateReservation(
        buildUpdateReservationMock({ currentDate: 'domingo 01 de marzo 2020 01/03/2020' }),
      ),
    ).resolves.toMatchObject({
      status: StatusEnum.DATE_ALREADY_PASSED,
      error: true,
    });
  });

  it('should reject reservation update when target reservation is in the past', async () => {
    await expect(
      service.updateReservation(
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

    const result = await service.updateReservation(buildUpdateReservationMock());

    expect(result.status).toBe(StatusEnum.NO_DATE_FOUND);
    expect(result.error).toBe(true);
    expect(result.message).toContain('reserva con los datos proporcionados');
  });

  it('should return duplicate same day response when phone already has another booking that day', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(true);

    await expect(service.updateReservation(buildUpdateReservationMock())).resolves.toMatchObject({
      status: StatusEnum.DUPLICATE_RESERVATION_SAME_DAY,
      error: true,
    });
  });

  it('should reject update when resulting quantity becomes a large reservation', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getRowValues.mockResolvedValue(updateCurrentRowValuesMock);

    await expect(
      service.updateReservation(buildUpdateReservationMock({ newQuantity: '13' })),
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

    const result = await service.updateReservation(
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
      service.updateReservation(
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

  it('should reject moved reservation when target slot has no availability', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.hasReservationByDateAndPhone.mockResolvedValue(false);
    googleSheetsServiceMock.getRowValues.mockResolvedValue(updateCurrentRowValuesMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: false,
      reservations: 42,
      available: 0,
    });

    const result = await service.updateReservation(
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

    const result = await service.updateReservation(
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
      service.updateReservation(
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
});
