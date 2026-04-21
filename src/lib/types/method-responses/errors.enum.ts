export enum StatusEnum {
  NO_DATE_FOUND = 'No se encontro la fecha',
  NO_AVAILABILITY = 'No hay disponibilidad para esa fecha y horario',
  DATE_ALREADY_PASSED = 'La fecha y horario seleccionado ya paso',
  DUPLICATE_RESERVATION_SAME_DAY = 'Ya existe una reserva para este dia con el mismo numero de telefono',
  RESERVATION_ERROR = 'Hubo un problema al procesar la reserva, por favor intenta nuevamente.',
  CLOSED_DAY = 'La fecha seleccionada corresponde a un dia cerrado',
  SUCCESS = 'Reserva creada correctamente',
  MISSING_DATA_UPDATE = 'Faltan datos de la reserva original',
}
