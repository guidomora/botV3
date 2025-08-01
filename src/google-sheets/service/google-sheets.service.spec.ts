import { Test } from "@nestjs/testing";
import { GoogleSheetsRepository } from "../domain/repository/google-sheets.repository";
import { GoogleSheetsService } from "./google-sheets.service";
import { SHEETS_NAMES } from "src/constants/sheets-name/sheets-name";
import { dateTimeMock } from "../test/datetime.mock";

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
})