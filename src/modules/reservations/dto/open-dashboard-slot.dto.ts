import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

const reservationTimePattern = /^\d{2}:\d{2}$/;

export class OpenDashboardSlotDto {
  @ApiProperty({
    description: 'Horario inicial de reapertura en formato HH:mm.',
    example: '13:00',
  })
  @Matches(reservationTimePattern, {
    message: 'fromTime must be in HH:mm format',
  })
  fromTime!: string;

  @ApiProperty({
    description: 'Horario final de reapertura en formato HH:mm.',
    example: '14:00',
  })
  @Matches(reservationTimePattern, {
    message: 'toTime must be in HH:mm format',
  })
  toTime!: string;
}
