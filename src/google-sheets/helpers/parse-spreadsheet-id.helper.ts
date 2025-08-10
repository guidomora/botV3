import { sheets_v4 } from "googleapis";

export async function parseSpreadSheetId(spreadsheetId: string, sheets: sheets_v4.Sheets, sheetTitle:string):Promise<number | undefined> {
    try {
        const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet = sheetInfo.data.sheets?.find(
            (s) => s.properties?.title === sheetTitle
        );
        const sheetId = sheet?.properties?.sheetId

        if (typeof sheetId !== 'number') throw new Error('Sheet ID no encontrado');

        return sheetId
    } catch (error) {
        throw new Error('Error al obtener el sheetId - helper', error);
    }

}