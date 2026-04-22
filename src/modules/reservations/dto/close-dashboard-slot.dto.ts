import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

const reservationTimePattern = /^\d{2}:\d{2}$/;

export class CloseDashboardSlotDto {
  @ApiProperty({
    description: 'Horario inicial de cierre en formato HH:mm.',
    example: '13:00',
  })
  @Matches(reservationTimePattern, {
    message: 'fromTime must be in HH:mm format',
  })
  fromTime!: string;

  @ApiProperty({
    description: 'Horario final de cierre en formato HH:mm.',
    example: '15:00',
  })
  @Matches(reservationTimePattern, {
    message: 'toTime must be in HH:mm format',
  })
  toTime!: string;

  @ApiPropertyOptional({
    description: 'Motivo opcional del cierre parcial para uso operativo interno.',
    example: 'Evento privado',
  })
  @IsOptional()
  @IsString({ message: 'reason must be a string' })
  reason?: string;
}
