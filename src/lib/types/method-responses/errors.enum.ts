export enum StatusEnum {
  NO_DATE_FOUND = 'No se encontro la fecha',
  NO_AVAILABILITY = 'No hay disponibilidad para esa fecha y horario',
  DATE_ALREADY_PASSED = 'La fecha y horario seleccionado ya pasó',
  RESERVATION_ERROR = 'Hubo un problema al procesar la reserva, por favor intentá nuevamente.',
  SUCCESS = 'Reserva creada correctamente',
  MISSING_DATA_UPDATE = 'Faltan datos de la reserva original',
}
