import { DeleteReservationUseCase } from './delete-reservation.use-case';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
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

describe('DeleteReservationUseCase', () => {
  let useCase: DeleteReservationUseCase;

  const googleSheetsServiceMock = buildGoogleSheetsServiceMock();
  const generateDatetimeMock = buildGenerateDatetimeMock();

  beforeEach(() => {
    Object.values(googleSheetsServiceMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(generateDatetimeMock).forEach((mockFn) => mockFn.mockReset());

    useCase = new DeleteReservationUseCase(
      googleSheetsServiceMock as unknown as GoogleSheetsService,
      generateDatetimeMock as unknown as GenerateDatetime,
    );
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

  it('should delete old rows in both sheets when cutoff date exists', async () => {
    generateDatetimeMock.createPastDay.mockReturnValue('martes 10 de marzo 2030 10/03/2030');
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValueOnce(12).mockResolvedValueOnce(20);

    await expect(useCase.deleteOldRows()).resolves.toBeUndefined();

    expect(googleSheetsServiceMock.deleteOldRows).toHaveBeenNthCalledWith(1, 4, 12, 0);
    expect(googleSheetsServiceMock.deleteOldRows).toHaveBeenNthCalledWith(2, 4, 20, 1);
  });

  it('should stop when first sheet cutoff date is not found', async () => {
    generateDatetimeMock.createPastDay.mockReturnValue('martes 10 de marzo 2030 10/03/2030');
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValue(-1);

    await expect(useCase.deleteOldRows()).resolves.toBe('No se encontro la fecha');

    expect(googleSheetsServiceMock.deleteOldRows).not.toHaveBeenCalled();
  });

  it('should stop when second sheet cutoff date is not found', async () => {
    generateDatetimeMock.createPastDay.mockReturnValue('martes 10 de marzo 2030 10/03/2030');
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValueOnce(12).mockResolvedValueOnce(-1);

    await expect(useCase.deleteOldRows()).resolves.toBe('No se encontro la fecha');

    expect(googleSheetsServiceMock.deleteOldRows).toHaveBeenCalledTimes(1);
  });
});
