import { TemporalStatusEnum } from 'src/lib';
import {
  existingReservationDateLabelMock,
  futureReservationDateLabelMock,
} from './sheets-data.mock';

export const temporalCompletedSnapshotMock = {
  date: futureReservationDateLabelMock,
  time: '20:00',
  name: 'Guido',
  phone: '1154916243',
  quantity: '4',
};

export const temporalInProgressSnapshotMock = {
  date: futureReservationDateLabelMock,
  name: 'guido',
};

export const temporalCompletedRowMock = {
  status: TemporalStatusEnum.COMPLETED,
  missingFields: [],
  rowIndex: 9,
  snapshot: temporalCompletedSnapshotMock,
};

export const temporalInProgressRowMock = {
  status: TemporalStatusEnum.IN_PROGRESS,
  missingFields: ['time'],
  rowIndex: 9,
  snapshot: temporalInProgressSnapshotMock,
};

export const deleteReservationRequestMock = {
  date: existingReservationDateLabelMock,
  time: '22:00',
  name: 'guido',
  phone: '54-9-1154916243',
};

export const createReservationRequestMock = {
  date: futureReservationDateLabelMock,
  time: '20:00',
  name: 'guido',
  phone: '54-9-1154916243',
  quantity: 4,
};
