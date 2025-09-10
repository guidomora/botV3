import { TemporalDataType } from "src/lib";

export function customDataSheetHelper(values: TemporalDataType): TemporalDataType {
    return {
        date: values.date ?? " ",
        time: values.time ?? " ",
        name: values.name ?? " ",
        phone: values.phone ?? " ",
        quantity: values.quantity ?? " ",
      };
}
    
