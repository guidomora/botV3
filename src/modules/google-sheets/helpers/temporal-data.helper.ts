import { TemporalDataType } from "src/lib";

export function customDataSheetHelper(values: TemporalDataType): TemporalDataType {
    return {
        date: values.date ?? " ",
        time: values.time ?? " ",
        name: values.name ?? " ",
        phone: values.phone ?? " ",
        quantity: values.quantity ?? " ",
        waId: values.waId ?? " ",
      };
}

export function a1(sheetName: string, colLetter: string, row: number) {
  return `${sheetName}!${colLetter}${row}`;
}



    
