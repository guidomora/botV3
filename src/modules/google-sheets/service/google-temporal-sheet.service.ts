import { Injectable } from '@nestjs/common';
import { GoogleTemporalSheetsRepository } from '../domain/repository/google-temporal-sheet.repository';
import { AddMissingFieldInput, TemporalDataType } from 'src/lib';
import { SHEETS_NAMES } from 'src/constants';
import { TemporalStatusEnum } from 'src/lib';
import { computeStatus, objectToRowArray, buildEmptyRow } from '../helpers/temporal-data.helper';
import { Logger } from '@nestjs/common';
import { TemporalDataRows } from 'src/constants/tables-info/temporal-data-rows';

@Injectable()
export class GoogleTemporalSheetsService {
  logger = new Logger(GoogleTemporalSheetsService.name);
  constructor(private readonly googleTemporalSheetsRepository: GoogleTemporalSheetsRepository) {}

  async addMissingField(input: AddMissingFieldInput): Promise<TemporalDataRows> {
    const sheetName = SHEETS_NAMES[2];
    const { waId, values } = input;

    let rowIndex = await this.googleTemporalSheetsRepository.findRowIndexByWaId(sheetName, waId);

    if (rowIndex === -1) {
      const seed = buildEmptyRow(waId);

      await this.googleTemporalSheetsRepository.appendSeedRow(sheetName, seed);
      rowIndex = await this.googleTemporalSheetsRepository.findRowIndexByWaId(sheetName, waId);
      if (rowIndex === -1) {
        throw new Error(`No se pudo localizar la fila recién creada para ${waId}`); //TODO: check this err description
      }
    }

    const currentRow = await this.googleTemporalSheetsRepository.readRowByIndex(
      sheetName,
      rowIndex,
    );
    const current = this.rowArrayToObject(currentRow, waId);

    const changedFields: string[] = [];
    const next = { ...current };

    const apply = (key: keyof TemporalDataType, incoming?: string) => {
      if (incoming !== undefined && incoming !== null) {
        const val = String(incoming).trim();
        if (val && val !== next[key]) {
          next[key] = val;
          changedFields.push(key);
        }
      }
    };

    apply('date', values.date?.toLowerCase());
    apply('time', values.time);
    apply('name', values.name?.toLowerCase());
    apply('phone', values.phone);
    apply('quantity', values.quantity);

    const { status, missingFields } = computeStatus(next);
    next.status = status;
    const fullRow = objectToRowArray(next);
    await this.googleTemporalSheetsRepository.updateFullRow(sheetName, rowIndex, fullRow);

    return {
      status: next.status,
      missingFields,
      rowIndex,
      snapshot: next,
      changedFields,
    };
  }

  async findTemporalRowIndexByWaId(waId: string): Promise<number> {
    const sheetName = SHEETS_NAMES[2];
    return this.googleTemporalSheetsRepository.findRowIndexByWaId(sheetName, waId);
  }

  private rowArrayToObject(row: string[], waIdFallback: string) {
    const safe = [...row];
    while (safe.length < 10) safe.push(' ');

    const [date, time, name, phone, service, quantity, waId, status, intent] = safe;
    return {
      date: date || ' ',
      time: time || ' ',
      name: name || ' ',
      phone: phone || ' ',
      service: service || 'Food',
      quantity: quantity || ' ',
      waId: waId || waIdFallback,
      status: (status as TemporalStatusEnum) || TemporalStatusEnum.NO_DATA,
      intent: intent || 'create',
    };
  }
}
