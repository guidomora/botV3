import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, Matches, Min } from 'class-validator';

const reservationDatePattern = /^(\d{4}-\d{2}-\d{2}|.*\d{2}\/\d{2}\/\d{4})$/;
const reservationTimePattern = /^\d{2}:\d{2}$/;

export class UpdateDashboardReservationDto {
  @ApiProperty({
    description: 'Telefono actual de la reserva a editar.',
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

  @ApiPropertyOptional({
    description:
      'Nueva fecha de la reserva. Acepta formato ISO yyyy-mm-dd o label de agenda con dd/mm/yyyy.',
    example: '2026-04-11',
  })
  @IsOptional()
  @Matches(reservationDatePattern, {
    message: 'date must be a valid reservation date reference',
  })
  date?: string;

  @ApiPropertyOptional({
    description: 'Nuevo horario de la reserva en formato HH:mm.',
    example: '21:00',
  })
  @IsOptional()
  @Matches(reservationTimePattern, {
    message: 'time must be in HH:mm format',
  })
  time?: string;

  @ApiPropertyOptional({
    description: 'Nuevo nombre del cliente.',
    example: 'Juan Perez',
  })
  @IsOptional()
  @IsNotEmpty({ message: 'name should not be empty' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Nueva cantidad de personas.',
    example: 4,
  })
  @IsOptional()
  @IsInt({ message: 'quantity must be an integer number' })
  @Min(1, { message: 'quantity must not be less than 1' })
  quantity?: number;
}
