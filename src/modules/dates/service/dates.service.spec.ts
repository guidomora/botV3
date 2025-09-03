import { DatesService } from "./dates.service";
import { GoogleSheetsService } from "src/google-sheets/service/google-sheets.service";
import { CreateDayUseCase, CreateReservationRowUseCase, DeleteReservationUseCase } from "../application";
import { createReservationMock } from "../test/mocks/reservation.mock";
import { DeleteReservation } from "src/lib";
import { Test } from "@nestjs/testing";
import { Logger } from "@nestjs/common";

describe('GIVEN DatesService', () => {
    let datesService: DatesService;
    let googleSheetsService: GoogleSheetsService;
    let createDayUseCase: CreateDayUseCase;
    let createReservationRowUseCase: CreateReservationRowUseCase;
    let deleteReservationUseCase: DeleteReservationUseCase;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                DatesService,
                {
                    provide: CreateDayUseCase,
                    useValue: {
                        createDate: jest.fn().mockResolvedValue('date created'),
                        createNextDate: jest.fn().mockResolvedValue('next date created'),
                        createXDates: jest.fn().mockResolvedValue('dates created'),
                    },
                },
                {
                    provide: CreateReservationRowUseCase,
                    useValue: {
                        createReservation: jest.fn().mockResolvedValue('reservation added'),
                    },
                },
                {
                    provide: DeleteReservationUseCase,
                    useValue: {
                        deleteReservation: jest.fn().mockResolvedValue('reservation deleted'),
                    },
                },
                {
                    provide: GoogleSheetsService,
                    useValue: {
                        checkDate: jest.fn(),
                    },
                },
            ],
        }).compile();

        datesService = module.get<DatesService>(DatesService);
        googleSheetsService = module.get<GoogleSheetsService>(GoogleSheetsService);
        createDayUseCase = module.get<CreateDayUseCase>(CreateDayUseCase);
        createReservationRowUseCase = module.get<CreateReservationRowUseCase>(CreateReservationRowUseCase);
        deleteReservationUseCase = module.get<DeleteReservationUseCase>(DeleteReservationUseCase);
        loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('SHOULD be defined', () => {
        expect(datesService).toBeDefined();
    });

    describe('WHEN createDate is called', () => {
        it('SHOULD return the use case result', async () => {
            const result = await datesService.createDate();
            expect(createDayUseCase.createDate).toHaveBeenCalled();
            expect(result).toBe('date created');
        });
    });

    describe('WHEN createNextDate is called', () => {
        it('SHOULD return the use case result', async () => {
            const result = await datesService.createNextDate();
            expect(createDayUseCase.createNextDate).toHaveBeenCalled();
            expect(result).toBe('next date created');
        });
    });

    describe('WHEN createXDates is called', () => {
        it('SHOULD return the use case result', async () => {
            const quantity = 3;
            const result = await datesService.createXDates(quantity);
            expect(createDayUseCase.createXDates).toHaveBeenCalledWith(quantity);
            expect(result).toBe('dates created');
        });
    });

    describe('WHEN createReservation is called', () => {
        it('SHOULD delegate to the use case', async () => {
            const result = await datesService.createReservation(createReservationMock);
            expect(createReservationRowUseCase.createReservation).toHaveBeenCalledWith(createReservationMock);
            expect(result).toBe('reservation added');
        });
    });

    describe('WHEN checkDate is called', () => {
        it('SHOULD return true if the date exists', async () => {
            (googleSheetsService.checkDate as jest.Mock).mockResolvedValue(true);
            const result = await datesService.checkDate('date');
            expect(result).toBe(true);
        });

        it('SHOULD return false if the date does not exist', async () => {
            (googleSheetsService.checkDate as jest.Mock).mockResolvedValue(false);
            const result = await datesService.checkDate('date');
            expect(result).toBe(false);
        });

        it('SHOULD throw an error and log it', async () => {
            const errorMock = new Error('check failed');
            (googleSheetsService.checkDate as jest.Mock).mockRejectedValue(errorMock);
            await expect(datesService.checkDate('date')).rejects.toThrow('check failed');
            expect(loggerErrorSpy).toHaveBeenCalledWith('Error al obtener el dia', errorMock);
        });
    });

    describe('WHEN deleteReservation is called', () => {
        it('SHOULD delegate to the use case', async () => {
            const data: DeleteReservation = { phone: '1', date: 'd', time: 't', name: 'n' };
            const result = await datesService.deleteReservation(data);
            expect(deleteReservationUseCase.deleteReservation).toHaveBeenCalledWith(data);
            expect(result).toBe('reservation deleted');
        });
    });
});