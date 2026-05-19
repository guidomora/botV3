import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWT } from 'google-auth-library';
import { google } from 'googleapis';
import { HealthCheckLiveResponse, HealthCheckReadyResponse } from 'src/lib';
import { DatabaseHealthService } from 'src/modules/database/service/database-health.service';
import { ReservationJobsRedisService } from 'src/modules/reservation-jobs/service/reservation-jobs-redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly reservationJobsRedisService: ReservationJobsRedisService,
    private readonly databaseHealthService: DatabaseHealthService,
  ) {}

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
      const redisStatus = this.reservationJobsRedisService.isEnabled() ? 'error' : 'disabled';

      return {
        status: 'error',
        type: 'readiness',
        timestamp,
        checks: {
          config: 'error',
          googleSheets: 'error',
          postgres: 'error',
          redis: redisStatus,
        },
      };
    }

    const googleSheetsOk = await this.canAccessGoogleSheets();
    const postgresOk = await this.databaseHealthService.isHealthy();
    const redisStatus = await this.reservationJobsRedisService.getReadinessStatus();
    const overallStatus = googleSheetsOk && postgresOk && redisStatus !== 'error' ? 'ok' : 'error';

    return {
      status: overallStatus,
      type: 'readiness',
      timestamp,
      checks: {
        config: 'ok',
        googleSheets: googleSheetsOk ? 'ok' : 'error',
        postgres: postgresOk ? 'ok' : 'error',
        redis: redisStatus,
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
