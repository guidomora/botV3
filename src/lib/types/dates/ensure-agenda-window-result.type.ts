export type EnsureAgendaWindowResult = {
  targetDaysAhead: number;
  currentCoverageDays: number;
  missingDays: number;
  createdDays: number;
  lastRegisteredDate: string | null;
  message: string;
};
