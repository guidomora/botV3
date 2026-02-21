import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleSheetsService } from './service/google-sheets.service';
import { GoogleSheetsRepository } from './domain/repository/google-sheets.repository';
import { GoogleSheetsController } from './controller/google-sheets.controller';
import { GoogleTemporalSheetsService } from './service/google-temporal-sheet.service';
import { GoogleTemporalSheetsRepository } from './domain/repository/google-temporal-sheet.repository';
import { DatesModule } from '../dates/dates.module';

@Module({})
export class GoogleSheetsModule {
  static forRoot(): DynamicModule {
    return {
      module: GoogleSheetsModule,
      imports: [ConfigModule, DatesModule],
      controllers: [GoogleSheetsController],
      providers: [
        {
          provide: GoogleSheetsRepository,
          useFactory: (config: ConfigService) => {
            const sheetId = config.get<string>('SPREADSHEET_ID');
            const clientEmail = config.get<string>('GOOGLE_CLIENT_EMAIL');
            const privateKey = config.get<string>('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

            if (!sheetId || !clientEmail || !privateKey) {
              throw new Error('Faltan variables para Google Sheets');
            }

            return new GoogleSheetsRepository({
              sheetId,
              clientEmail,
              privateKey,
            });
          },
          inject: [ConfigService],
        },
        {
          provide: GoogleTemporalSheetsRepository,
          useFactory: (config: ConfigService) => {
            const sheetId = config.get<string>('SPREADSHEET_ID');
            const clientEmail = config.get<string>('GOOGLE_CLIENT_EMAIL');
            const privateKey = config.get<string>('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

            if (!sheetId || !clientEmail || !privateKey) {
              throw new Error('Faltan variables para Google Sheets');
            }

            return new GoogleTemporalSheetsRepository({
              sheetId,
              clientEmail,
              privateKey,
            });
          },
          inject: [ConfigService],
        },
        GoogleSheetsService,
        GoogleTemporalSheetsService,
      ],
      exports: [GoogleSheetsService, GoogleTemporalSheetsService],
    };
  }
}
