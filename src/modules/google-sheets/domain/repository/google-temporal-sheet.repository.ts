import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { JWT } from "google-auth-library";
import { sheets_v4, google } from "googleapis";
import { GoogleSheetsOpts, TemporalDataType } from "src/lib";

@Injectable()
export class GoogleTemporalSheetsRepository {
    private readonly sheets: sheets_v4.Sheets;
    private readonly sheetId: string;

    constructor(opts: GoogleSheetsOpts,) {
        this.sheetId = opts.sheetId;

        const auth = new JWT({
            email: opts.clientEmail,
            key: opts.privateKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        this.sheets = google.sheets({ version: 'v4', auth });
    }

    async addMissingField(range: string, values: any) {
        try {
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.sheetId,
                range,
                valueInputOption: 'RAW',
                requestBody: { values: [values] },
            });
        } catch (error) {
            this.failure(error);
        }
    }

    failure(error: unknown, msg = 'Google Sheets error'): never {
        console.error(error);
        throw new InternalServerErrorException(msg);
    }
}