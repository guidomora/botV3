import { Test } from "@nestjs/testing";
import { GoogleSheetsRepository } from "../domain/repository/google-sheets.repository";
import { GoogleSheetsService } from "./google-sheets.service";
import { SHEETS_NAMES } from "src/constants/sheets-name/sheets-name";
import { dateTimeMock } from "../test/datetime.mock";
import { AddDataType } from "src/lib/types/add-data.type";
import { ReservationOperation } from "src/lib";

describe('GIVEN GoogleSheetsService', () => {
    let googleRepository: GoogleSheetsRepository;
    let googleService: GoogleSheetsService;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                GoogleSheetsService,
                {
                    provide: GoogleSheetsRepository,
                    useValue: {
                        appendRow: jest.fn(),
                        getLastRowValue: jest.fn(),
                        getDates: jest.fn(),
                        getRowValues: jest.fn(),
                        createReservation: jest.fn(),
                        getAvailability: jest.fn(),
                        updateAvailability: jest.fn(),
                        insertRow: jest.fn(),
                        failure: jest.fn(),
                        updateAvailabilitySheet: jest.fn(),
                    },
                },
            ],
        }).compile();

        googleService = module.get<GoogleSheetsService>(GoogleSheetsService);
        googleRepository = module.get<GoogleSheetsRepository>(GoogleSheetsRepository);
    })

    afterEach(() => {
        jest.clearAllMocks();
    })

    it('SHOULD be defined', () => {
        expect(googleService).toBeDefined();
    })

    const range = `${SHEETS_NAMES[0]}!A:A`;

    describe('WHEN appendRow is called', () => {
        it('SHOULD call appendRow on the repository', () => {
            const values = dateTimeMock;
            googleService.appendRow(range, values);
            expect(googleRepository.appendRow).toHaveBeenCalledWith(range, values);
        });
    })

    describe('WHEN getLastRowValue is called', () => {
        it('SHOULD call getLastRowValue on the repository', async () => {
            const lastRowValue = 'sábado 26 de julio 2025 26/07/2025';
            (googleRepository.getLastRowValue as jest.Mock).mockResolvedValue(lastRowValue);

            const result = await googleService.getLastRowValue(range);

            expect(googleRepository.getLastRowValue).toHaveBeenCalledWith(range);
            expect(result).toEqual(lastRowValue);
        });
    })

    describe('WHEN checkDate is called', () => {
        it('SHOULD call checkDate on the repository', async () => {
            const date = 'sábado 26 de julio 2025 26/07/2025';
            (googleRepository.getDates as jest.Mock).mockResolvedValue(dateTimeMock);

            const result = await googleService.checkDate(date);

            expect(googleRepository.getDates).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('SHOULD return false if the date does not exist', async () => {
            const date = 'viernes 26 de julio 2025 26/07/2025';
            (googleRepository.getDates as jest.Mock).mockResolvedValue(dateTimeMock);

            const result = await googleService.checkDate(date);

            expect(googleRepository.getDates).toHaveBeenCalled();
            expect(result).toBe(false);
        });
    })

    describe('WHEN getDate is called', () => {
        it('SHOULD return the row index if the date and time exist', async () => {
            const date = 'sábado 26 de julio 2025 26/07/2025';
            const time = '12:00';
            (googleRepository.getDates as jest.Mock).mockResolvedValue(dateTimeMock);

            const result = await googleService.getDate(date, time);

            expect(googleRepository.getDates).toHaveBeenCalledWith(`${SHEETS_NAMES[0]}!A:C`);
            expect(result).toBe(3);
        });

        it('SHOULD return -1 if the date and time do not exist', async () => {
            const date = 'domingo 27 de julio 2025 27/07/2025';
            const time = '12:00';
            (googleRepository.getDates as jest.Mock).mockResolvedValue(dateTimeMock);

            const result = await googleService.getDate(date, time);

            expect(googleRepository.getDates).toHaveBeenCalledWith(`${SHEETS_NAMES[0]}!A:C`);
            expect(result).toBe(-1);
        });
    })

    describe('WHEN getRowValues is called', () => {
        it('SHOULD call getRowValues on the repository', async () => {
            (googleRepository.getRowValues as jest.Mock).mockResolvedValue(dateTimeMock);

            const result = await googleService.getRowValues(range);

            expect(googleRepository.getRowValues).toHaveBeenCalledWith(range);
            expect(result).toEqual(dateTimeMock);
        });
    })

    describe('WHEN createReservation is called', () => {
        it('SHOULD call createReservation on the repository', async () => {
            const values: AddDataType = {
                customerData: {
                    date: 'sábado 26 de julio 2025 26/07/2025',
                    time: '12:00',
                    name: 'John Doe',
                    phone: '123456789',
                    quantity: 2,
                },
            };

            await googleService.createReservation(range, values);

            expect(googleRepository.createReservation).toHaveBeenCalledWith(range, values);
        });
    })

    describe('WHEN getAvailability is called', () => {
        it('SHOULD return availability info from the repository', async () => {
            const availabilityData = [['5', '15']];
            const date = '2025-07-26';
            const time = '20:00';
            const index = 3;
            jest.spyOn(googleService, 'getDate').mockResolvedValue(index);
            (googleRepository.getAvailability as jest.Mock).mockResolvedValue(availabilityData);

            const result = await googleService.getAvailability(date, time);

            expect(googleService.getDate).toHaveBeenCalledWith(date, time, `${SHEETS_NAMES[1]}!A:C`);
            expect(googleRepository.getAvailability).toHaveBeenCalledWith(`${SHEETS_NAMES[1]}!C${index}:D${index}`);
            expect(result).toEqual({
                isAvailable: true,
                reservations: 5,
                available: 15,
            });
        });

        it('SHOULD set isAvailable to false when there is no availability', async () => {
            const availabilityData = [['21', '0']];
            const date = '2025-07-26';
            const time = '20:00';
            const index = 3;
            jest.spyOn(googleService, 'getDate').mockResolvedValue(index);
            (googleRepository.getAvailability as jest.Mock).mockResolvedValue(availabilityData);

            const result = await googleService.getAvailability(date, time);

            expect(result).toEqual({
                isAvailable: false,
                reservations: 21,
                available: 0,
            });
        });
    });

    describe('WHEN updateAvailability is called', () => {
        it('SHOULD call updateAvailabilitySheet on the repository with updated values', async () => {
            const params = { reservations: 3, available: 10, date: '2025-07-26', time: '20:00' };
            const index = 2;
            jest.spyOn(googleService, 'getDate').mockResolvedValue(index);

            await googleService.updateAvailability(ReservationOperation.ADD, params);

            expect(googleService.getDate).toHaveBeenCalledWith(params.date, params.time, `${SHEETS_NAMES[1]}!A:C`);
            expect(googleRepository.updateAvailabilitySheet).toHaveBeenCalledWith(`${SHEETS_NAMES[1]}!C${index}:D${index}`, 4, 9);
        });

        it('SHOULD call failure on the repository if there is no availability', async () => {
            const params = { reservations: 3, available: 0, date: '2025-07-26', time: '20:00' };
            const index = 2;
            jest.spyOn(googleService, 'getDate').mockResolvedValue(index);

            await googleService.updateAvailability(ReservationOperation.ADD, params);

            expect(googleRepository.failure).toHaveBeenCalled();
            expect(googleRepository.updateAvailabilitySheet).not.toHaveBeenCalled();
        });
    });

    describe('WHEN insertRow is called', () => {
        it('SHOULD call insertRow on the repository and return the new index', async () => {
            const rowIndex = 5;
            const result = await googleService.insertRow(`${SHEETS_NAMES[0]}!A:C`, rowIndex);

            expect(googleRepository.insertRow).toHaveBeenCalledWith(rowIndex, 0);
            expect(result).toBe(rowIndex + 1);
        });

        it('SHOULD use sheet index 1 when using AVAILABLE_BOOKINGS sheet', async () => {
            const rowIndex = 3;
            await googleService.insertRow(`${SHEETS_NAMES[1]}!A:C`, rowIndex);

            expect(googleRepository.insertRow).toHaveBeenCalledWith(rowIndex, 1);
        });
    });
})