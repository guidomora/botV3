import { Test } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { GoogleSheetsService } from "src/google-sheets/service/google-sheets.service";
import { CreateReservationRowUseCase } from "./create-reservation.use-case";
import { CreateReservationType, ReservationOperation } from "src/lib";
import { SHEETS_NAMES } from "src/constants";
import { createReservationMock, newRowReservationMock } from "../test/mocks/reservation.mock";
import { Availability } from "src/lib/types/availability/availability.type";


describe("GIVEN CreateReservationRowUseCase", () => {
  let createReservationRowUseCase: CreateReservationRowUseCase;
  let googleSheetsService: GoogleSheetsService;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CreateReservationRowUseCase,
        {
          provide: GoogleSheetsService,
          useValue: {
            getDate: jest.fn(),
            getAvailability: jest.fn(),
            getRowValues: jest.fn(),
            createReservation: jest.fn(),
            updateAvailability: jest.fn(),
            insertRow: jest.fn(),
          },
        },
      ],
    }).compile();

    createReservationRowUseCase = module.get<CreateReservationRowUseCase>(
      CreateReservationRowUseCase,
    );
    googleSheetsService = module.get<GoogleSheetsService>(GoogleSheetsService);
    loggerErrorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("SHOULD be defined", () => {
    expect(createReservationRowUseCase).toBeDefined();
  });

  describe("WHEN createReservation is called", () => {
    const reservation: CreateReservationType = createReservationMock;

    it("SHOULD return a message if the date is not found", async () => {
      (googleSheetsService.getDate as jest.Mock).mockResolvedValue(-1);

      const result = await createReservationRowUseCase.createReservation(
        reservation,
      );

      expect(result).toBe("No se encontro la fecha");
    });

    it("SHOULD return a message if there is no availability", async () => {
      (googleSheetsService.getDate as jest.Mock).mockResolvedValue(5);
      const availability: Availability = {
        isAvailable: false,
        reservations: 0,
        available: 0,
      };
      (googleSheetsService.getAvailability as jest.Mock).mockResolvedValue(
        availability,
      );

      const result = await createReservationRowUseCase.createReservation(
        reservation,
      );

      expect(result).toBe(
        "No hay disponibilidad para esa fecha y horario",
      );
    });

    it("SHOULD create a new row when the current row is full", async () => {
      const index = 3;
      const availability: Availability = {
        isAvailable: true,
        reservations: 0,
        available: 20,
      };
      (googleSheetsService.getDate as jest.Mock).mockResolvedValue(index);
      (googleSheetsService.getAvailability as jest.Mock).mockResolvedValue(
        availability,
      );
      (googleSheetsService.getRowValues as jest.Mock).mockResolvedValue([
        "date",
        "time",
        "foo",
        "bar",
        "baz",
        "qux",
      ]);
      const reservationAndRowSpy = jest
        .spyOn(createReservationRowUseCase, "createReservationAndRow")
        .mockResolvedValue();

      const result = await createReservationRowUseCase.createReservation(
        reservation,
      );

      expect(reservationAndRowSpy).toHaveBeenCalledWith(index, {
        date: "date",
        time: "time",
        name: reservation.name,
        phone: reservation.phone,
        quantity: reservation.quantity,
      });
      expect(googleSheetsService.updateAvailability).toHaveBeenCalledWith(
        ReservationOperation.ADD,
        {
          reservations: availability.reservations,
          available: availability.available,
          date: reservation.date!,
          time: reservation.time!,
        },
      );
      expect(result).toBe(
        `Reserva creada correctamente para el dia ${reservation.date} a las ${reservation.time} para ${reservation.name} y ${reservation.quantity} personas`,
      );
    });

    it("SHOULD create the reservation in the same row when there is space", async () => {
      const index = 5;
      const availability: Availability = {
        isAvailable: true,
        reservations: 0,
        available: 20,
      };
      (googleSheetsService.getDate as jest.Mock).mockResolvedValue(index);
      (googleSheetsService.getAvailability as jest.Mock).mockResolvedValue(
        availability,
      );
      (googleSheetsService.getRowValues as jest.Mock).mockResolvedValue([
        "date",
        "time",
        undefined,
        undefined,
        undefined,
        undefined,
      ]);

      const result = await createReservationRowUseCase.createReservation(
        reservation,
      );

      expect(googleSheetsService.createReservation).toHaveBeenCalledWith(
        `${SHEETS_NAMES[0]}!C${index}:F${index}`,
        {
          customerData: {
            name: reservation.name,
            phone: reservation.phone,
            quantity: reservation.quantity,
          },
        },
      );
      expect(result).toBe(
        `Reserva creada correctamente para el dia ${reservation.date} a las ${reservation.time} para ${reservation.name} y ${reservation.quantity} personas`,
      );
    });

    it("SHOULD throw an error and log it", async () => {
      const errorMock = new Error("Append failed");
      (googleSheetsService.getDate as jest.Mock).mockRejectedValue(
        errorMock,
      );

      await expect(
        createReservationRowUseCase.createReservation(reservation),
      ).rejects.toThrow("Append failed");
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Error al agregar la reserva",
        errorMock,
      );
    });
  });

  describe("WHEN createReservationAndRow is called", () => {
    it("SHOULD insert a row and create the reservation", async () => {
      (googleSheetsService.insertRow as jest.Mock).mockResolvedValue(7);

      await createReservationRowUseCase.createReservationAndRow(
        5,
        newRowReservationMock,
      );

      expect(googleSheetsService.insertRow).toHaveBeenCalledWith(
        `${SHEETS_NAMES[0]}!A5:F5`,
        5,
      );
      expect(googleSheetsService.createReservation).toHaveBeenCalledWith(
        `${SHEETS_NAMES[0]}!A7:F7`,
        { customerData: newRowReservationMock },
      );
    });
  });
});