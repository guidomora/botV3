import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWT } from 'google-auth-library';
import { google } from 'googleapis';
import { HealthCheckLiveResponse, HealthCheckReadyResponse } from 'src/lib';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getLiveStatus(): HealthCheckLiveResponse {
    return {
      status: 'ok',
      type: 'liveness',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  async getReadyStatus(): Promise<HealthCheckReadyResponse> {
    const timestamp = new Date().toISOString();
    const configOk = this.hasRequiredConfiguration();

    if (!configOk) {
      return {
        status: 'error',
        type: 'readiness',
        timestamp,
        checks: {
          config: 'error',
          googleSheets: 'error',
        },
      };
    }

    const googleSheetsOk = await this.canAccessGoogleSheets();

    return {
      status: googleSheetsOk ? 'ok' : 'error',
      type: 'readiness',
      timestamp,
      checks: {
        config: 'ok',
        googleSheets: googleSheetsOk ? 'ok' : 'error',
      },
    };
  }

  private hasRequiredConfiguration(): boolean {
    return Boolean(
      this.configService.get<string>('SPREADSHEET_ID') &&
        this.configService.get<string>('GOOGLE_CLIENT_EMAIL') &&
        this.configService.get<string>('GOOGLE_PRIVATE_KEY') &&
        this.configService.get<string>('HEALTH_CHECK_SECRET'),
    );
  }

  private async canAccessGoogleSheets(): Promise<boolean> {
    try {
      const sheetId = this.configService.get<string>('SPREADSHEET_ID');
      const clientEmail = this.configService.get<string>('GOOGLE_CLIENT_EMAIL');
      const privateKey = this.configService
        .get<string>('GOOGLE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');

      if (!sheetId || !clientEmail || !privateKey) {
        return false;
      }

      const auth = new JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        includeGridData: false,
        fields: 'spreadsheetId',
      });

      return true;
    } catch {
      return false;
    }
  }
}
