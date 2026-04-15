import { DeleteReservationUseCase } from './delete-reservation.use-case';
import { GenerateDatetime } from '../dateTime-build/generate-datetime';
import { deleteReservationRequestMock } from '../test/mocks/reservation-scenarios.mock';
import {
  duplicatedReservationSheetRowsMock,
  singleReservationSheetRowMock,
} from '../test/mocks/sheets-data.mock';
import {
  generateDatetimeMock as buildGenerateDatetimeMock,
  googleSheetsServiceMock as buildGoogleSheetsServiceMock,
} from '../test/mocks/dependency-mocks';
import { DatesSheetPort } from '../ports';

describe('DeleteReservationUseCase', () => {
  let useCase: DeleteReservationUseCase;

  const googleSheetsServiceMock = buildGoogleSheetsServiceMock();
  const generateDatetimeMock = buildGenerateDatetimeMock();

  beforeEach(() => {
    Object.values(googleSheetsServiceMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(generateDatetimeMock).forEach((mockFn) => mockFn.mockReset());
    process.env.AGENDA_DAYS_BACK_TO_KEEP = '15';

    useCase = new DeleteReservationUseCase(
      googleSheetsServiceMock as unknown as DatesSheetPort,
      generateDatetimeMock as unknown as GenerateDatetime,
    );
  });

  afterEach(() => {
    delete process.env.AGENDA_DAYS_BACK_TO_KEEP;
  });

  it('should clear reservation cells when there is only one row for the slot', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.getDatetimeDates.mockResolvedValue(singleReservationSheetRowMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      reservations: 0,
      available: 42,
    });

    await expect(useCase.deleteReservation(deleteReservationRequestMock)).resolves.toBe(
      'Su reserva ha sido cancelada correctamente.',
    );

    expect(googleSheetsServiceMock.deleteReservation).toHaveBeenCalledWith('Reservas!C27:F27');
    expect(googleSheetsServiceMock.refreshAvailabilityForDate).toHaveBeenCalledWith(
      deleteReservationRequestMock.date,
    );
  });

  it('should delete the full row when there are duplicated rows for the same slot', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.getDatetimeDates.mockResolvedValue(duplicatedReservationSheetRowsMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      reservations: 2,
      available: 40,
    });

    await useCase.deleteReservation(deleteReservationRequestMock);

    expect(googleSheetsServiceMock.deleteRow).toHaveBeenCalledWith(27, 0);
    expect(googleSheetsServiceMock.deleteReservation).not.toHaveBeenCalled();
  });

  it('should return a friendly message when reservation cannot be found', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(-1);

    await expect(useCase.deleteReservation(deleteReservationRequestMock)).resolves.toBe(
      'Algunos de los datos ingresados no coinciden con la reserva.',
    );
  });

  it('should rethrow unexpected errors while deleting reservation', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockRejectedValue(new Error('lookup-failed'));

    await expect(useCase.deleteReservation(deleteReservationRequestMock)).rejects.toThrow(
      'lookup-failed',
    );
  });

  it('should skip availability refresh when requested by an orchestrator', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.getDatetimeDates.mockResolvedValue(singleReservationSheetRowMock);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      reservations: 0,
      available: 42,
    });

    await useCase.deleteReservation(deleteReservationRequestMock, {
      skipAvailabilityRefresh: true,
    });

    expect(googleSheetsServiceMock.refreshAvailabilityForDate).not.toHaveBeenCalled();
  });

  it('should delete old rows in both sheets when cutoff date exists', async () => {
    generateDatetimeMock.createPastDay.mockReturnValue('lunes 02 de marzo 2030 02/03/2030');
    googleSheetsServiceMock.getFirstRowValue.mockResolvedValue(
      'viernes 14 de febrero 2030 14/02/2030',
    );
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValueOnce(12).mockResolvedValueOnce(20);

    await expect(useCase.deleteOldRows()).resolves.toBe(
      'Se eliminaron las filas anteriores a lunes 02 de marzo 2030 02/03/2030.',
    );

    expect(googleSheetsServiceMock.deleteOldRows).toHaveBeenNthCalledWith(1, 4, 12, 0);
    expect(googleSheetsServiceMock.deleteOldRows).toHaveBeenNthCalledWith(2, 4, 20, 1);
    expect(generateDatetimeMock.createPastDay).toHaveBeenCalledWith(14);
  });

  it('should skip deletion when there are no rows in the availability sheet', async () => {
    generateDatetimeMock.createPastDay.mockReturnValue('lunes 02 de marzo 2030 02/03/2030');
    googleSheetsServiceMock.getFirstRowValue.mockResolvedValue('no hay valores');

    await expect(useCase.deleteOldRows()).resolves.toBe('No hay filas antiguas para eliminar.');

    expect(googleSheetsServiceMock.getDateIndexByDate).not.toHaveBeenCalled();
    expect(googleSheetsServiceMock.deleteOldRows).not.toHaveBeenCalled();
  });

  it('should skip deletion when retention window is already satisfied', async () => {
    generateDatetimeMock.createPastDay.mockReturnValue('lunes 02 de marzo 2030 02/03/2030');
    googleSheetsServiceMock.getFirstRowValue.mockResolvedValue(
      'martes 10 de marzo 2030 10/03/2030',
    );

    await expect(useCase.deleteOldRows()).resolves.toBe('No hay filas antiguas para eliminar.');

    expect(googleSheetsServiceMock.getDateIndexByDate).not.toHaveBeenCalled();
    expect(googleSheetsServiceMock.deleteOldRows).not.toHaveBeenCalled();
  });

  it('should stop when first sheet cutoff date is not found', async () => {
    generateDatetimeMock.createPastDay.mockReturnValue('lunes 02 de marzo 2030 02/03/2030');
    googleSheetsServiceMock.getFirstRowValue.mockResolvedValue(
      'viernes 14 de febrero 2030 14/02/2030',
    );
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValue(-1);

    await expect(useCase.deleteOldRows()).resolves.toBe('No se encontro la fecha de corte.');

    expect(googleSheetsServiceMock.deleteOldRows).not.toHaveBeenCalled();
  });

  it('should stop when second sheet cutoff date is not found', async () => {
    generateDatetimeMock.createPastDay.mockReturnValue('lunes 02 de marzo 2030 02/03/2030');
    googleSheetsServiceMock.getFirstRowValue.mockResolvedValue(
      'viernes 14 de febrero 2030 14/02/2030',
    );
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValueOnce(12).mockResolvedValueOnce(-1);

    await expect(useCase.deleteOldRows()).resolves.toBe('No se encontro la fecha de corte.');

    expect(googleSheetsServiceMock.deleteOldRows).toHaveBeenCalledTimes(1);
  });

  it('should rethrow unexpected errors while deleting old rows', async () => {
    generateDatetimeMock.createPastDay.mockReturnValue('lunes 02 de marzo 2030 02/03/2030');
    googleSheetsServiceMock.getFirstRowValue.mockResolvedValue(
      'viernes 14 de febrero 2030 14/02/2030',
    );
    googleSheetsServiceMock.getDateIndexByDate.mockRejectedValue(new Error('delete-old-failed'));

    await expect(useCase.deleteOldRows()).rejects.toThrow('delete-old-failed');
  });

  it('should throw when retention env is invalid', async () => {
    process.env.AGENDA_DAYS_BACK_TO_KEEP = '0';

    await expect(useCase.deleteOldRows()).rejects.toThrow(
      'La variable de entorno AGENDA_DAYS_BACK_TO_KEEP debe ser un numero entero mayor a 0.',
    );
  });
});
