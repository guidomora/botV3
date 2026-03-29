import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { HealthService } from './health.service';
import { createConfigServiceMock } from '../test/mocks/dependency-mocks';

jest.mock('googleapis', () => ({
  google: {
    sheets: jest.fn(),
  },
}));

describe('HealthService', () => {
  let healthService: HealthService;
  let configService: ReturnType<typeof createConfigServiceMock>;
  const googleSheetsMock = google.sheets as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = createConfigServiceMock({
      SPREADSHEET_ID: 'spreadsheet-id',
      GOOGLE_CLIENT_EMAIL: 'bot@example.com',
      GOOGLE_PRIVATE_KEY: 'private-key',
      HEALTH_CHECK_SECRET: 'super-secret',
    });
    healthService = new HealthService(configService as unknown as ConfigService);
  });

  it('debería devolver liveness ok', () => {
    const result = healthService.getLiveStatus();

    expect(result.status).toBe('ok');
    expect(result.type).toBe('liveness');
    expect(result.timestamp).toBeDefined();
  });

  it('debería devolver readiness ok cuando Google Sheets responde', async () => {
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
    });
    expect(getMock).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-id',
      includeGridData: false,
      fields: 'spreadsheetId',
    });
  });

  it('debería devolver readiness error cuando falta configuración crítica', async () => {
    configService = createConfigServiceMock({
      SPREADSHEET_ID: 'spreadsheet-id',
      GOOGLE_CLIENT_EMAIL: 'bot@example.com',
    });
    healthService = new HealthService(configService as unknown as ConfigService);

    const result = await healthService.getReadyStatus();

    expect(result.status).toBe('error');
    expect(result.type).toBe('readiness');
    expect(typeof result.timestamp).toBe('string');
    expect(result.checks).toEqual({
      config: 'error',
      googleSheets: 'error',
    });
  });

  it('debería devolver readiness error cuando Google Sheets falla', async () => {
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
    });
  });
});
