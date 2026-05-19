import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { DatabaseHealthService } from 'src/modules/database/service/database-health.service';
import { ReservationJobsRedisService } from 'src/modules/reservation-jobs/service/reservation-jobs-redis.service';
import { createConfigServiceMock } from '../test/mocks/dependency-mocks';
import { HealthService } from './health.service';

jest.mock('googleapis', () => ({
  google: {
    sheets: jest.fn(),
  },
}));

describe('HealthService', () => {
  let healthService: HealthService;
  let configService: ReturnType<typeof createConfigServiceMock>;
  let reservationJobsRedisService: jest.Mocked<ReservationJobsRedisService>;
  let databaseHealthService: jest.Mocked<DatabaseHealthService>;
  const googleSheetsMock = google.sheets as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = createConfigServiceMock({
      SPREADSHEET_ID: 'spreadsheet-id',
      GOOGLE_CLIENT_EMAIL: 'bot@example.com',
      GOOGLE_PRIVATE_KEY: 'private-key',
      HEALTH_CHECK_SECRET: 'super-secret',
    });
    reservationJobsRedisService = {
      isEnabled: jest.fn().mockReturnValue(false),
      getConfig: jest.fn(),
      getReadinessStatus: jest.fn().mockResolvedValue('disabled'),
    } as unknown as jest.Mocked<ReservationJobsRedisService>;
    databaseHealthService = {
      isHealthy: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<DatabaseHealthService>;
    healthService = new HealthService(
      configService as unknown as ConfigService,
      reservationJobsRedisService,
      databaseHealthService,
    );
  });

  it('deberia devolver liveness ok', () => {
    const result = healthService.getLiveStatus();

    expect(result.status).toBe('ok');
    expect(result.type).toBe('liveness');
    expect(result.timestamp).toBeDefined();
  });

  it('deberia devolver readiness ok cuando Google Sheets y PostgreSQL responden', async () => {
    const getMock = jest.fn().mockResolvedValue({ data: { spreadsheetId: 'spreadsheet-id' } });
    googleSheetsMock.mockReturnValue({
      spreadsheets: {
        get: getMock,
      },
    });

    const result = await healthService.getReadyStatus();

    expect(result.status).toBe('ok');
    expect(result.type).toBe('readiness');
    expect(typeof result.timestamp).toBe('string');
    expect(result.checks).toEqual({
      config: 'ok',
      googleSheets: 'ok',
      postgres: 'ok',
      redis: 'disabled',
    });
    expect(getMock).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-id',
      includeGridData: false,
      fields: 'spreadsheetId',
    });
  });

  it('deberia devolver readiness error cuando falta configuracion critica', async () => {
    configService = createConfigServiceMock({
      SPREADSHEET_ID: 'spreadsheet-id',
      GOOGLE_CLIENT_EMAIL: 'bot@example.com',
    });
    reservationJobsRedisService.isEnabled.mockReturnValue(true);
    healthService = new HealthService(
      configService as unknown as ConfigService,
      reservationJobsRedisService,
      databaseHealthService,
    );

    const result = await healthService.getReadyStatus();

    expect(result.status).toBe('error');
    expect(result.type).toBe('readiness');
    expect(typeof result.timestamp).toBe('string');
    expect(result.checks).toEqual({
      config: 'error',
      googleSheets: 'error',
      postgres: 'error',
      redis: 'error',
    });
    expect(databaseHealthService.isHealthy.mock.calls).toHaveLength(0);
  });

  it('deberia devolver readiness error cuando Google Sheets falla', async () => {
    const getMock = jest.fn().mockRejectedValue(new Error('google-sheets-failed'));
    googleSheetsMock.mockReturnValue({
      spreadsheets: {
        get: getMock,
      },
    });

    const result = await healthService.getReadyStatus();

    expect(result.status).toBe('error');
    expect(result.type).toBe('readiness');
    expect(typeof result.timestamp).toBe('string');
    expect(result.checks).toEqual({
      config: 'ok',
      googleSheets: 'error',
      postgres: 'ok',
      redis: 'disabled',
    });
  });

  it('deberia devolver readiness error cuando PostgreSQL falla', async () => {
    const getMock = jest.fn().mockResolvedValue({ data: { spreadsheetId: 'spreadsheet-id' } });
    googleSheetsMock.mockReturnValue({
      spreadsheets: {
        get: getMock,
      },
    });
    databaseHealthService.isHealthy.mockResolvedValue(false);

    const result = await healthService.getReadyStatus();

    expect(result.status).toBe('error');
    expect(result.type).toBe('readiness');
    expect(typeof result.timestamp).toBe('string');
    expect(result.checks).toEqual({
      config: 'ok',
      googleSheets: 'ok',
      postgres: 'error',
      redis: 'disabled',
    });
  });

  it('deberia devolver readiness error cuando Redis esta habilitado y falla', async () => {
    const getMock = jest.fn().mockResolvedValue({ data: { spreadsheetId: 'spreadsheet-id' } });
    googleSheetsMock.mockReturnValue({
      spreadsheets: {
        get: getMock,
      },
    });
    reservationJobsRedisService.isEnabled.mockReturnValue(true);
    reservationJobsRedisService.getReadinessStatus.mockResolvedValue('error');

    const result = await healthService.getReadyStatus();

    expect(result.status).toBe('error');
    expect(result.type).toBe('readiness');
    expect(typeof result.timestamp).toBe('string');
    expect(result.checks).toEqual({
      config: 'ok',
      googleSheets: 'ok',
      postgres: 'ok',
      redis: 'error',
    });
  });
});
