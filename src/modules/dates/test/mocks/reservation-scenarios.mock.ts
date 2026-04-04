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
  previousSnapshot: temporalCompletedSnapshotMock,
};

export const temporalInProgressRowMock = {
  status: TemporalStatusEnum.IN_PROGRESS,
  missingFields: ['time'],
  rowIndex: 9,
  snapshot: temporalInProgressSnapshotMock,
  previousSnapshot: {
    name: 'guido',
  },
};

export const temporalDateClearedRowMock = {
  status: TemporalStatusEnum.IN_PROGRESS,
  missingFields: ['date', 'time', 'phone', 'quantity'],
  rowIndex: 9,
  snapshot: {
    date: ' ',
    time: ' ',
    name: 'guido',
    phone: ' ',
    quantity: ' ',
    service: 'Food',
    waId: '5491154916243',
    intent: 'create',
  },
  previousSnapshot: {
    date: futureReservationDateLabelMock,
    time: '20:00',
    name: 'guido',
    phone: '1154916243',
    quantity: '4',
    service: 'Food',
    waId: '5491154916243',
    intent: 'create',
  },
};

export const temporalTimeClearedRowMock = {
  status: TemporalStatusEnum.IN_PROGRESS,
  missingFields: ['time'],
  rowIndex: 9,
  snapshot: {
    date: futureReservationDateLabelMock,
    time: ' ',
    name: 'Guido',
    phone: '1154916243',
    quantity: '4',
    service: 'Food',
    waId: '5491154916243',
    intent: 'create',
  },
  previousSnapshot: {
    date: futureReservationDateLabelMock,
    time: '21:00',
    name: 'Guido',
    phone: '1154916243',
    quantity: '4',
    service: 'Food',
    waId: '5491154916243',
    intent: 'create',
  },
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
