import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { DeleteReservationUseCase } from './delete-reservation.use-case';
import { DeleteReservation, ReservationOperation } from 'src/lib';
import { SHEETS_NAMES } from 'src/constants';
import { deleteReservationMock } from '../test/mocks/reservation.mock';
import { Availability } from 'src/lib/types/availability/availability.type';
import { GenerateDatetime } from '../dateTime-build/generate-datetime';

describe('GIVEN DeleteReservationUseCase', () => {
  let deleteReservationUseCase: DeleteReservationUseCase;
  let googleSheetsService: GoogleSheetsService;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DeleteReservationUseCase,
        {
          provide: GoogleSheetsService,
          useValue: {
            getDateIndexByData: jest.fn(),
            getDatetimeDates: jest.fn(),
            deleteReservation: jest.fn(),
            deleteRow: jest.fn(),
            getAvailability: jest.fn(),
            updateAvailability: jest.fn(),
          },
        },
        {
          provide: GenerateDatetime,
          useValue: {
            createPastDay: jest.fn(),
          },
        },
      ],
    }).compile();

    deleteReservationUseCase = module.get<DeleteReservationUseCase>(DeleteReservationUseCase);
    googleSheetsService = module.get<GoogleSheetsService>(GoogleSheetsService);
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('SHOULD be defined', () => {
    expect(deleteReservationUseCase).toBeDefined();
  });

  describe('WHEN deleteReservation is called', () => {
    const reservation: DeleteReservation = deleteReservationMock;

    it('SHOULD return a message if the date is not found', async () => {
      (googleSheetsService.getDateIndexByData as jest.Mock).mockResolvedValue(-1);

      const result = await deleteReservationUseCase.deleteReservation(reservation);

      expect(result).toBe('No se encontro la fecha');
    });

    it('SHOULD delete the reservation when there is only one date', async () => {
      const index = 3;
      const availability: Availability = {
        isAvailable: true,
        reservations: 1,
        available: 19,
      };
      (googleSheetsService.getDateIndexByData as jest.Mock).mockResolvedValue(index);
      (googleSheetsService.getDatetimeDates as jest.Mock).mockResolvedValue(['date']);
      (googleSheetsService.getAvailability as jest.Mock).mockResolvedValue(availability);

      const result = await deleteReservationUseCase.deleteReservation(reservation);

      expect(googleSheetsService.deleteReservation).toHaveBeenCalledWith(
        `${SHEETS_NAMES[0]}!C${index}:F${index}`,
      );
      expect(googleSheetsService.updateAvailability).toHaveBeenCalledWith(
        ReservationOperation.SUBTRACT,
        {
          reservations: availability.reservations,
          available: availability.available,
          date: reservation.date!,
          time: reservation.time!,
        },
      );
      expect(result).toBe('Reserva eliminada correctamente');
    });

    it('SHOULD delete the row when there are multiple dates', async () => {
      const index = 5;
      const availability: Availability = {
        isAvailable: true,
        reservations: 1,
        available: 19,
      };
      (googleSheetsService.getDateIndexByData as jest.Mock).mockResolvedValue(index);
      (googleSheetsService.getDatetimeDates as jest.Mock).mockResolvedValue(['date1', 'date2']);
      (googleSheetsService.getAvailability as jest.Mock).mockResolvedValue(availability);

      const result = await deleteReservationUseCase.deleteReservation(reservation);

      expect(googleSheetsService.deleteRow).toHaveBeenCalledWith(index, 0);
      expect(googleSheetsService.updateAvailability).toHaveBeenCalledWith(
        ReservationOperation.SUBTRACT,
        {
          reservations: availability.reservations,
          available: availability.available,
          date: reservation.date!,
          time: reservation.time!,
        },
      );
      expect(result).toBe('Reserva eliminada correctamente');
    });

    it('SHOULD throw an error and log it', async () => {
      const errorMock = new Error('delete failed');
      (googleSheetsService.getDateIndexByData as jest.Mock).mockRejectedValue(errorMock);

      await expect(deleteReservationUseCase.deleteReservation(reservation)).rejects.toThrow(
        'delete failed',
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error al eliminar la reserva', errorMock);
    });
  });
});
