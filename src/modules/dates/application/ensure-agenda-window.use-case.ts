import { Inject, Injectable, Logger } from '@nestjs/common';
import { EnsureAgendaWindowResult } from 'src/lib';
import { SHEETS_NAMES } from 'src/constants';
import { parseDate } from '../utils/parseDate';
import { CreateDayUseCase } from './create-day.use-case';
import { DATES_SHEET_PORT } from '../dates.tokens';
import { DatesSheetPort } from '../ports';

@Injectable()
export class EnsureAgendaWindowUseCase {
  private readonly logger = new Logger(EnsureAgendaWindowUseCase.name);
  private static readonly ONE_DAY_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly createDayUseCase: CreateDayUseCase,
    @Inject(DATES_SHEET_PORT) private readonly datesSheetPort: DatesSheetPort,
  ) {}

  async ensureAgendaWindow(): Promise<EnsureAgendaWindowResult> {
    const targetDaysAhead = this.getTargetDaysAhead();
    const today = this.normalizeDate(new Date());
    const desiredLastDate = new Date(today);
    desiredLastDate.setDate(desiredLastDate.getDate() + targetDaysAhead - 1);

    const lastRegisteredDate = await this.datesSheetPort.getLastRowValue(`${SHEETS_NAMES[1]}!A:A`);

    if (lastRegisteredDate === 'no hay valores') {
      await this.createDayUseCase.createXDatesFrom(today, targetDaysAhead);

      return {
        targetDaysAhead,
        currentCoverageDays: 0,
        missingDays: targetDaysAhead,
        createdDays: targetDaysAhead,
        lastRegisteredDate: null,
        message: `Se crearon ${targetDaysAhead} dias para abrir la agenda desde hoy.`,
      };
    }

    const parsedLastRegisteredDate = this.normalizeDate(parseDate(lastRegisteredDate));
    const currentCoverageDays = this.calculateInclusiveCoverageDays(
      today,
      parsedLastRegisteredDate,
    );

    if (parsedLastRegisteredDate >= desiredLastDate) {
      this.logger.log(
        `La agenda ya esta cubierta. Cobertura actual=${currentCoverageDays}, objetivo=${targetDaysAhead}, ultimoDia=${lastRegisteredDate}`,
      );

      return {
        targetDaysAhead,
        currentCoverageDays,
        missingDays: 0,
        createdDays: 0,
        lastRegisteredDate,
        message: `La agenda ya cubre ${currentCoverageDays} dias. No se agregaron nuevas fechas.`,
      };
    }

    const missingDays = this.calculateMissingDays(parsedLastRegisteredDate, desiredLastDate);

    if (parsedLastRegisteredDate < today) {
      await this.createDayUseCase.createXDatesFrom(today, targetDaysAhead);
    } else {
      await this.createDayUseCase.createXDates(missingDays);
    }

    this.logger.log(
      `Agenda sincronizada. Cobertura actual=${currentCoverageDays}, creados=${missingDays}`,
    );

    return {
      targetDaysAhead,
      currentCoverageDays,
      missingDays,
      createdDays: missingDays,
      lastRegisteredDate,
      message: `Se agregaron ${missingDays} dias para completar ${targetDaysAhead} dias de agenda.`,
    };
  }

  private getTargetDaysAhead(): number {
    const targetDaysAhead = Number(process.env.AGENDA_DAYS_AHEAD);

    if (!Number.isInteger(targetDaysAhead) || targetDaysAhead <= 0) {
      throw new Error(
        'La variable de entorno AGENDA_DAYS_AHEAD debe ser un numero entero mayor a 0.',
      );
    }

    return targetDaysAhead;
  }

  private normalizeDate(date: Date): Date {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
  }

  private calculateInclusiveCoverageDays(today: Date, lastRegisteredDate: Date): number {
    if (lastRegisteredDate < today) {
      return 0;
    }

    const differenceMs = lastRegisteredDate.getTime() - today.getTime();
    return Math.floor(differenceMs / EnsureAgendaWindowUseCase.ONE_DAY_MS) + 1;
  }

  private calculateMissingDays(lastRegisteredDate: Date, desiredLastDate: Date): number {
    if (lastRegisteredDate < this.normalizeDate(new Date())) {
      const differenceMs = desiredLastDate.getTime() - this.normalizeDate(new Date()).getTime();
      return Math.floor(differenceMs / EnsureAgendaWindowUseCase.ONE_DAY_MS) + 1;
    }

    const differenceMs = desiredLastDate.getTime() - lastRegisteredDate.getTime();
    return Math.floor(differenceMs / EnsureAgendaWindowUseCase.ONE_DAY_MS);
  }
}
