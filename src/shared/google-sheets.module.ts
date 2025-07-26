import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleSheetsService } from './service/google-sheets.service';
import { GoogleSheetsRepository } from './domain/entities/google-sheets.repository';


@Module({})
export class GoogleSheetsModule {
  static forRoot(): DynamicModule {
    return {
      module: GoogleSheetsModule,
      imports: [ConfigModule],

      providers: [
        {
          provide: GoogleSheetsRepository,
          useFactory: (config: ConfigService) => {
            const sheetId = config.get<string>('SPREADSHEET_ID');
            const clientEmail = config.get<string>('GOOGLE_CLIENT_EMAIL');
            const privateKey = config
              .get<string>('GOOGLE_PRIVATE_KEY')
              ?.replace(/\\n/g, '\n');

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
        GoogleSheetsService,
      ],
      exports: [GoogleSheetsService],
    };
  }
}
