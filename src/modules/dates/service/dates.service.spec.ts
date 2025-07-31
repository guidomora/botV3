import { Test } from "@nestjs/testing";
import { GoogleSheetsService } from "src/google-sheets/service/google-sheets.service";
import { CreateDayUseCase } from "../aplication/create-day.use-case";
import { DatesService } from "./dates.service";
import { dateTimeMock, dateTimeWithBookingsMock } from "../test/mocks/date.mock";
import { Logger } from "@nestjs/common";
import { parseDate } from "../utils/parseDate";

describe('GIVEN DatesService', () => {
    let datesService: DatesService;
    let googleSheetsService: GoogleSheetsService;
    let createDayUseCase: CreateDayUseCase;

    const date = 'sábado 26 de julio 2025 26/07/2025';

    const quantity = 2;

    let loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    let loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    beforeEach(async () => {

        const module = await Test.createTestingModule({
            providers: [
                DatesService,
                {
                    provide: GoogleSheetsService,
                    useValue: {
                        appendRow: jest.fn(),
                        getLasRowValue: jest.fn(),
                        checkDate: jest.fn(),
                    },
                },
                {
                    provide: CreateDayUseCase,
                    useValue: {
                        createDateTime: jest.fn(() => dateTimeMock),
                        createOneDayWithBookings: jest.fn(() => dateTimeWithBookingsMock),
                        createNextDay: jest.fn(() => date),
                    },
                },
            ],
        }).compile();

        datesService = module.get<DatesService>(DatesService);
        googleSheetsService = module.get<GoogleSheetsService>(GoogleSheetsService);
        createDayUseCase = module.get<CreateDayUseCase>(CreateDayUseCase);
        loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
        loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    })

    afterEach(() => {
        jest.clearAllMocks();
    });


    it('SHOULD be defined', () => {
        expect(datesService).toBeDefined();
    })

    describe('WHEN createDate is called', () => {
        it('SHOULD create the datetime and bookings', async () => {
            const result = await datesService.createDate();

            expect(createDayUseCase.createDateTime()).toEqual(dateTimeMock);

            expect(createDayUseCase.createOneDayWithBookings()).toEqual(dateTimeWithBookingsMock);

            expect(googleSheetsService.appendRow).toHaveBeenCalledTimes(2);

            expect(result).toEqual(`Se agrego el dia ${date}`);
        });

        it('SHOULD throw an error and log it', async () => {
            const errorMock = new Error('Append failed');

            (googleSheetsService.appendRow as jest.Mock).mockImplementationOnce(() => {
                throw errorMock;
            });

            await expect(datesService.createDate()).rejects.toThrow('Append failed');

            expect(googleSheetsService.appendRow).toHaveBeenCalledTimes(1);
            expect(loggerErrorSpy).toHaveBeenCalledWith('Error al agregar el dia', errorMock);

            loggerErrorSpy.mockRestore();
        });
    })

    describe('WHEN createNextDate is called', () => {

        const beforeDate = 'viernes 25 de julio 2025 25/07/2025'
        const parsedDate = parseDate(beforeDate);


        it('SHOULD return the matrix of datetime for the next day', async () => {
            (googleSheetsService.getLasRowValue as jest.Mock).mockResolvedValue(beforeDate);
            (createDayUseCase.createNextDay as jest.Mock).mockReturnValue(date);

            const result = await datesService.createNextDate();

            expect(createDayUseCase.createNextDay).toHaveBeenCalledWith(parsedDate);
            expect(createDayUseCase.createDateTime).toHaveBeenCalledWith(date);
            expect(createDayUseCase.createOneDayWithBookings).toHaveBeenCalledWith(date);
            expect(googleSheetsService.appendRow).toHaveBeenCalledTimes(2);
            expect(result).toEqual(`Se agrego el dia sábado 26 de julio 2025 26/07/2025`);
        });

        it('SHOULD throw an error and log it', async () => {
            const errorMock = new Error('Append failed');

            (googleSheetsService.getLasRowValue as jest.Mock).mockResolvedValue(beforeDate);
            (googleSheetsService.appendRow as jest.Mock).mockImplementationOnce(() => {
                throw errorMock;
            });

            await expect(datesService.createNextDate()).rejects.toThrow('Append failed');

            expect(googleSheetsService.appendRow).toHaveBeenCalledTimes(1);
            expect(loggerErrorSpy).toHaveBeenCalledWith('Error al agregar el dia', errorMock);
        });
    })

    describe('WHEN createXDates is called', () => {
        const beforeDate = 'viernes 25 de julio 2025 25/07/2025';
        const quantity = 3;
        const parsedDate = parseDate(beforeDate);
      
        it('SHOULD create multiple dates and log the result', async () => {
          (googleSheetsService.getLasRowValue as jest.Mock).mockResolvedValue(beforeDate);
          (createDayUseCase.createNextDay as jest.Mock).mockReturnValue(date);
          (createDayUseCase.createDateTime as jest.Mock).mockReturnValue(dateTimeMock);
          (createDayUseCase.createOneDayWithBookings as jest.Mock).mockReturnValue(dateTimeWithBookingsMock);
      
          const result = await datesService.createXDates(quantity);
      
          expect(googleSheetsService.getLasRowValue).toHaveBeenCalledTimes(quantity);
          expect(createDayUseCase.createNextDay).toHaveBeenCalledTimes(quantity);
          expect(createDayUseCase.createNextDay).toHaveBeenNthCalledWith(1, parsedDate); // opcional
      
          expect(createDayUseCase.createDateTime).toHaveBeenCalledTimes(quantity);
          expect(createDayUseCase.createOneDayWithBookings).toHaveBeenCalledTimes(quantity);
      
          expect(googleSheetsService.appendRow).toHaveBeenCalledTimes(quantity * 2);
          expect(loggerLogSpy).toHaveBeenCalledWith(`Se agregaron ${quantity} dias`, 'DatesService');
          expect(result).toBe(`Se agregaron ${quantity} dias`);
        });
      
        it('SHOULD throw an error and log it', async () => {
          const errorMock = new Error('Append failed');
      
          (googleSheetsService.getLasRowValue as jest.Mock).mockResolvedValue(beforeDate);
          (googleSheetsService.appendRow as jest.Mock).mockImplementationOnce(() => {
            throw errorMock;
          });
      
          await expect(datesService.createXDates(quantity)).rejects.toThrow('Append failed');
      
          expect(googleSheetsService.appendRow).toHaveBeenCalledTimes(1);
          expect(loggerErrorSpy).toHaveBeenCalledWith('Error al agregar el dia', errorMock);
        });
    })

    describe('WHEN checkDate is called', () => {
        it('SHOULD return true if the date exists', async () => {
          const date = 'viernes 25 de julio 2025 25/07/2025';
          (googleSheetsService.checkDate as jest.Mock).mockResolvedValue(true);
          const result = await datesService.checkDate(date);
          expect(result).toBe(true);
        });

        it('SHOULD return false if the date does not exist', async () => {
          const date = 'viernes 26 de julio 2025 25/07/2025';
          (googleSheetsService.checkDate as jest.Mock).mockResolvedValue(false);
          const result = await datesService.checkDate(date);
          expect(result).toBe(false);
        });
    })
})

