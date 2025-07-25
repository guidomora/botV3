// shared/google-sheets/google-sheets.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleSheetsService } from './google-sheets.service';

@Module({})
export class GoogleSheetsModule {
  static forRoot(): DynamicModule {
    return {
      module: GoogleSheetsModule,
      imports: [ConfigModule],

      providers: [
        {
          provide: GoogleSheetsService,
          useFactory: (config: ConfigService) => {
            // 🔒 Validamos que existan, así ya no son “string | undefined”
            const sheetId = config.get<string>('SPREADSHEET_ID');
            const clientEmail = config.get<string>('GOOGLE_CLIENT_EMAIL');
            const privateKey = config
              .get<string>('GOOGLE_PRIVATE_KEY')
              ?.replace(/\\n/g, '\n');

            if (!sheetId || !clientEmail || !privateKey) {
              throw new Error('Faltan variables para Google Sheets');
            }

            return new GoogleSheetsService({
              sheetId,
              clientEmail,
              privateKey,
            });
          },
          inject: [ConfigService],
        },
      ],
      exports: [GoogleSheetsService],
    };
  }
}
