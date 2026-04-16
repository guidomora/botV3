import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

const reservationDatePattern = /^(\d{4}-\d{2}-\d{2}|.*\d{2}\/\d{2}\/\d{4})$/;
const reservationTimePattern = /^\d{2}:\d{2}$/;

export class DeleteDashboardReservationDto {
  @ApiProperty({
    description: 'Telefono actual de la reserva a eliminar.',
    example: '1122334455',
  })
  @IsNotEmpty({ message: 'phone should not be empty' })
  phone!: string;

  @ApiProperty({
    description:
      'Fecha actual de la reserva. Acepta formato ISO yyyy-mm-dd o label de agenda con dd/mm/yyyy.',
    example: '2026-04-10',
  })
  @Matches(reservationDatePattern, {
    message: 'currentDate must be a valid reservation date reference',
  })
  currentDate!: string;

  @ApiProperty({
    description: 'Horario actual de la reserva en formato HH:mm.',
    example: '20:00',
  })
  @Matches(reservationTimePattern, {
    message: 'currentTime must be in HH:mm format',
  })
  currentTime!: string;
}
