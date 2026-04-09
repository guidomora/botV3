import { DatesSheetPort, DatesTemporalSheetPort, StatusEnum, TemporalStatusEnum } from 'src/lib';
import {
  CreateDayUseCase,
  CreateReservationRowUseCase,
  DeleteReservationUseCase,
  EnsureAgendaWindowUseCase,
  UpdateReservationUseCase,
} from '../application';
import { DatesService } from './dates.service';
import { buildUpdateReservationMock } from '../test/builders/update-reservation.builder';
import {
  deleteReservationRequestMock,
  temporalCompletedRowMock,
  temporalDateClearedRowMock,
  temporalCompletedSnapshotMock,
  temporalInProgressRowMock,
  temporalTimeClearedRowMock,
} from '../test/mocks/reservation-scenarios.mock';
import {
  availabilityRowsMock,
  existingReservationDateLabelMock,
  futureReservationDateLabelMock,
} from '../test/mocks/sheets-data.mock';
import {
  createDayUseCaseMock as buildCreateDayUseCaseMock,
  createReservationRowUseCaseMock as buildCreateReservationRowUseCaseMock,
  deleteReservationUseCaseMock as buildDeleteReservationUseCaseMock,
  ensureAgendaWindowUseCaseMock as buildEnsureAgendaWindowUseCaseMock,
  googleSheetsServiceMock as buildGoogleSheetsServiceMock,
  googleTemporalSheetsServiceMock as buildGoogleTemporalSheetsServiceMock,
  updateReservationUseCaseMock as buildUpdateReservationUseCaseMock,
} from '../test/mocks/dependency-mocks';

describe('DatesService', () => {
  let service: DatesService;

  const createDayUseCaseMock = buildCreateDayUseCaseMock();
  const createReservationRowUseCaseMock = buildCreateReservationRowUseCaseMock();
  const deleteReservationUseCaseMock = buildDeleteReservationUseCaseMock();
  const ensureAgendaWindowUseCaseMock = buildEnsureAgendaWindowUseCaseMock();
  const updateReservationUseCaseMock = buildUpdateReservationUseCaseMock();
  const googleSheetsServiceMock = buildGoogleSheetsServiceMock();
  const googleTemporalSheetsServiceMock = buildGoogleTemporalSheetsServiceMock();

  beforeEach(() => {
    Object.values(createDayUseCaseMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(createReservationRowUseCaseMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(deleteReservationUseCaseMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(ensureAgendaWindowUseCaseMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(updateReservationUseCaseMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(googleSheetsServiceMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(googleTemporalSheetsServiceMock).forEach((mockFn) => mockFn.mockReset());

    process.env.MAX_PEOPLE_PER_RESERVATION = '12';
    process.env.LARGE_RESERVATION_CONTACT_NUMBER = '11-5555-0000';
    process.env.SLOT_INTERVAL_MINUTES = '60';

    service = new DatesService(
      createDayUseCaseMock as unknown as CreateDayUseCase,
      createReservationRowUseCaseMock as unknown as CreateReservationRowUseCase,
      deleteReservationUseCaseMock as unknown as DeleteReservationUseCase,
      ensureAgendaWindowUseCaseMock as unknown as EnsureAgendaWindowUseCase,
      updateReservationUseCaseMock as unknown as UpdateReservationUseCase,
      googleSheetsServiceMock as unknown as DatesSheetPort,
      googleTemporalSheetsServiceMock as unknown as DatesTemporalSheetPort,
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
    ensureAgendaWindowUseCaseMock.ensureAgendaWindow.mockResolvedValue({
      targetDaysAhead: 15,
      currentCoverageDays: 15,
      missingDays: 0,
      createdDays: 0,
      lastRegisteredDate: futureReservationDateLabelMock,
      message: 'ok',
    });

    await expect(service.createDate()).resolves.toBe('date-created');
    await expect(service.createNextDate()).resolves.toBe('next-date-created');
    await expect(service.createXDates(3)).resolves.toBe('x-dates-created');
    await expect(service.ensureAgendaWindow()).resolves.toEqual({
      targetDaysAhead: 15,
      currentCoverageDays: 15,
      missingDays: 0,
      createdDays: 0,
      lastRegisteredDate: futureReservationDateLabelMock,
      message: 'ok',
    });
  });

  it('should create reservation from temporal data when snapshot is completed', async () => {
    googleTemporalSheetsServiceMock.addMissingField.mockResolvedValue(temporalCompletedRowMock);
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValue(4);
    googleSheetsServiceMock.getDayAvailability.mockResolvedValue(availabilityRowsMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: true,
      reservations: 10,
      available: 32,
    });
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
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValue(4);
    googleSheetsServiceMock.getDayAvailability.mockResolvedValue(availabilityRowsMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: true,
      reservations: 10,
      available: 32,
    });
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
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValue(4);
    googleSheetsServiceMock.getDayAvailability.mockResolvedValue(availabilityRowsMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: true,
      reservations: 10,
      available: 32,
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
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValue(4);
    googleSheetsServiceMock.getDayAvailability.mockResolvedValue(availabilityRowsMock);

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

  it('should stop the flow early when the selected date is not loaded in agenda', async () => {
    googleTemporalSheetsServiceMock.addMissingField.mockResolvedValue({
      ...temporalInProgressRowMock,
      changedFields: ['date'],
      snapshot: {
        ...temporalInProgressRowMock.snapshot,
        waId: '5491154916243',
      },
    });
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValue(-1);
    googleTemporalSheetsServiceMock.clearFields.mockResolvedValue(temporalDateClearedRowMock);

    await expect(
      service.createReservationWithMultipleMessages({
        waId: '5491154916243',
        values: { date: futureReservationDateLabelMock },
      }),
    ).resolves.toEqual({
      status: TemporalStatusEnum.IN_PROGRESS,
      missingFields: temporalDateClearedRowMock.missingFields,
      reservationData: temporalDateClearedRowMock.snapshot,
      message: 'Esa fecha todavia no esta disponible en la agenda. Por favor elegi otra fecha.',
      errorStatus: StatusEnum.NO_DATE_FOUND,
    });

    expect(googleTemporalSheetsServiceMock.clearFields).toHaveBeenCalledWith('5491154916243', [
      'date',
      'time',
    ]);
  });

  it('should stop the flow early when the selected date has no availability', async () => {
    googleTemporalSheetsServiceMock.addMissingField.mockResolvedValue({
      ...temporalInProgressRowMock,
      changedFields: ['date'],
      snapshot: {
        ...temporalInProgressRowMock.snapshot,
        waId: '5491154916243',
      },
    });
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValue(4);
    googleSheetsServiceMock.getDayAvailability.mockResolvedValue([]);
    googleTemporalSheetsServiceMock.clearFields.mockResolvedValue(temporalDateClearedRowMock);

    await expect(
      service.createReservationWithMultipleMessages({
        waId: '5491154916243',
        values: { date: futureReservationDateLabelMock },
      }),
    ).resolves.toEqual({
      status: TemporalStatusEnum.IN_PROGRESS,
      missingFields: temporalDateClearedRowMock.missingFields,
      reservationData: temporalDateClearedRowMock.snapshot,
      message: 'No hay disponibilidad para esa fecha. Por favor elegi otra fecha.',
      errorStatus: StatusEnum.NO_AVAILABILITY,
    });
  });

  it('should suggest a new time early when the selected time is not available', async () => {
    googleTemporalSheetsServiceMock.addMissingField.mockResolvedValue({
      ...temporalInProgressRowMock,
      changedFields: ['time'],
      snapshot: {
        ...temporalCompletedSnapshotMock,
        waId: '5491154916243',
      },
      missingFields: [],
    });
    googleSheetsServiceMock.getDayAvailability.mockResolvedValue(availabilityRowsMock.slice(0, 2));
    googleTemporalSheetsServiceMock.clearFields.mockResolvedValue(temporalTimeClearedRowMock);

    await expect(
      service.createReservationWithMultipleMessages({
        waId: '5491154916243',
        values: { time: '20:00' },
      }),
    ).resolves.toEqual({
      status: TemporalStatusEnum.FAILED,
      missingFields: [],
      reservationData: {
        ...temporalCompletedSnapshotMock,
        waId: '5491154916243',
      },
      message: 'Ese horario no esta disponible. Te comparto horarios cercanos.',
      errorStatus: StatusEnum.NO_AVAILABILITY,
    });

    expect(googleTemporalSheetsServiceMock.clearFields).toHaveBeenCalledWith('5491154916243', [
      'time',
    ]);
  });

  it('should stop early when quantity makes the selected slot unavailable', async () => {
    googleTemporalSheetsServiceMock.addMissingField.mockResolvedValue({
      ...temporalCompletedRowMock,
      changedFields: ['quantity'],
      snapshot: {
        ...temporalCompletedSnapshotMock,
        waId: '5491154916243',
      },
      previousSnapshot: {
        ...temporalCompletedSnapshotMock,
        quantity: ' ',
        waId: '5491154916243',
      },
    });
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: false,
      reservations: 42,
      available: 0,
    });
    googleTemporalSheetsServiceMock.clearFields.mockResolvedValue(temporalTimeClearedRowMock);

    await expect(
      service.createReservationWithMultipleMessages({
        waId: '5491154916243',
        values: { quantity: '4' },
      }),
    ).resolves.toEqual({
      status: TemporalStatusEnum.FAILED,
      missingFields: [],
      reservationData: {
        ...temporalCompletedSnapshotMock,
        waId: '5491154916243',
      },
      message:
        'No hay lugar para esa cantidad de personas en ese horario. Proba con una hora cercana y te ayudo a encontrar lugar.',
      errorStatus: StatusEnum.NO_AVAILABILITY,
    });

    expect(createReservationRowUseCaseMock.createReservation).not.toHaveBeenCalled();
  });

  it('should not clear date again when only time was newly completed in temporal row', async () => {
    googleTemporalSheetsServiceMock.addMissingField.mockResolvedValue({
      status: TemporalStatusEnum.IN_PROGRESS,
      missingFields: ['quantity', 'phone'],
      rowIndex: 9,
      snapshot: {
        date: futureReservationDateLabelMock,
        time: '21:00',
        name: 'guido',
        phone: ' ',
        quantity: ' ',
        service: 'Food',
        waId: '5491154916243',
        intent: 'create',
      },
      previousSnapshot: {
        date: futureReservationDateLabelMock,
        time: ' ',
        name: 'guido',
        phone: ' ',
        quantity: ' ',
        service: 'Food',
        waId: '5491154916243',
        intent: 'create',
      },
      changedFields: ['date', 'time'],
    });
    googleSheetsServiceMock.getDayAvailability.mockResolvedValue([
      [futureReservationDateLabelMock, '20:00', '0', '42'],
      [futureReservationDateLabelMock, '21:00', '0', '40'],
    ]);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      isAvailable: true,
      reservations: 10,
      available: 32,
    });

    await expect(
      service.createReservationWithMultipleMessages({
        waId: '5491154916243',
        values: { time: '21:00' },
      }),
    ).resolves.toEqual({
      status: TemporalStatusEnum.IN_PROGRESS,
      missingFields: ['quantity', 'phone'],
      reservationData: {
        date: futureReservationDateLabelMock,
        time: '21:00',
        name: 'guido',
        phone: ' ',
        quantity: ' ',
        service: 'Food',
        waId: '5491154916243',
        intent: 'create',
      },
    });

    expect(googleSheetsServiceMock.getDateIndexByDate).not.toHaveBeenCalled();
    expect(googleTemporalSheetsServiceMock.clearFields).not.toHaveBeenCalled();
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

  it('should rethrow when deleting incomplete temporal reservation fails', async () => {
    googleTemporalSheetsServiceMock.findTemporalRowIndexByWaId.mockRejectedValue(
      new Error('temporal-failed'),
    );

    await expect(
      service.deleteIncompleteTemporalReservationByWaId('5491154916243'),
    ).rejects.toThrow('temporal-failed');
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

  it('should suggest nearby slots when requested time does not exist', async () => {
    googleSheetsServiceMock.getDayAvailability.mockResolvedValue(availabilityRowsMock);

    await expect(
      service.getDayAndTimeAvailability(futureReservationDateLabelMock, '17:30'),
    ).resolves.toEqual({
      date_label: futureReservationDateLabelMock,
      columns: ['time', 'available_tables'],
      slots: [
        { time: '17:00', available_tables: 40 },
        { time: '18:00', available_tables: 39 },
      ],
      summary: { first_time: '17:00', last_time: '18:00' },
    });
  });

  it('should fallback to 60 minutes when slot interval env is invalid', async () => {
    process.env.SLOT_INTERVAL_MINUTES = 'invalid';
    googleSheetsServiceMock.getDayAvailability.mockResolvedValue(availabilityRowsMock);

    await expect(
      service.getDayAndTimeAvailability(futureReservationDateLabelMock, '17:30'),
    ).resolves.toMatchObject({
      slots: [
        { time: '17:00', available_tables: 40 },
        { time: '18:00', available_tables: 39 },
      ],
      summary: { first_time: '17:00', last_time: '18:00' },
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

  it('should delegate updateReservation to its use case', async () => {
    const response = {
      status: StatusEnum.SUCCESS,
      message: 'ok',
      error: false,
    };
    const updateReservation = buildUpdateReservationMock();
    updateReservationUseCaseMock.updateReservation.mockResolvedValue(response);

    await expect(service.updateReservation(updateReservation)).resolves.toEqual(response);
    expect(updateReservationUseCaseMock.updateReservation).toHaveBeenCalledWith(updateReservation);
  });
});
