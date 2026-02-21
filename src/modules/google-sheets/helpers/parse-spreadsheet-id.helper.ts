import { sheets_v4 } from 'googleapis';

export async function parseSpreadSheetId(
  spreadsheetId: string,
  sheets: sheets_v4.Sheets,
  sheetNumber: number,
): Promise<number | undefined> {
  try {
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });

    const sheetId = sheetInfo.data.sheets?.[sheetNumber].properties?.sheetId;

    if (typeof sheetId !== 'number') throw new Error('Sheet ID no encontrado');

    return sheetId;
  } catch (error) {
    throw new Error('Error al obtener el sheetId - helper', error);
  }
}
