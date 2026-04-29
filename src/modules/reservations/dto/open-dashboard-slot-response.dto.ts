import { ApiProperty } from '@nestjs/swagger';

export class OpenDashboardSlotResponseDto {
  @ApiProperty({
    description: 'Fecha de la reapertura parcial en formato ISO.',
    example: '2026-04-16',
  })
  date!: string;

  @ApiProperty({
    description: 'Horario inicial reabierto.',
    example: '13:00',
  })
  fromTime!: string;

  @ApiProperty({
    description: 'Horario final reabierto.',
    example: '14:00',
  })
  toTime!: string;

  @ApiProperty({
    description: 'Indica si la franja quedo abierta.',
    example: false,
  })
  isClosed!: false;

  @ApiProperty({
    description: 'Cantidad de cierres parciales afectados por la reapertura.',
    example: 1,
  })
  reopenedSlotsCount!: number;
}
