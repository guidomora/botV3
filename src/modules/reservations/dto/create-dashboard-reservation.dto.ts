import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Matches, Min } from 'class-validator';

const isoReservationDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const reservationTimePattern = /^\d{2}:\d{2}$/;

export class CreateDashboardReservationDto {
  @ApiProperty({
    description: 'Fecha de la reserva en formato ISO yyyy-mm-dd.',
    example: '2026-04-16',
  })
  @Matches(isoReservationDatePattern, {
    message: 'date must be in yyyy-mm-dd format',
  })
  date!: string;

  @ApiProperty({
    description: 'Horario de la reserva en formato HH:mm.',
    example: '21:00',
  })
  @Matches(reservationTimePattern, {
    message: 'time must be in HH:mm format',
  })
  time!: string;

  @ApiProperty({
    description: 'Nombre del cliente.',
    example: 'Juan Perez',
  })
  @IsNotEmpty({ message: 'name should not be empty' })
  name!: string;

  @ApiProperty({
    description: 'Telefono del cliente.',
    example: '1122334455',
  })
  @IsNotEmpty({ message: 'phone should not be empty' })
  phone!: string;

  @ApiProperty({
    description: 'Cantidad de personas.',
    example: 4,
  })
  @IsInt({ message: 'quantity must be an integer number' })
  @Min(1, { message: 'quantity must not be less than 1' })
  quantity!: number;
}
