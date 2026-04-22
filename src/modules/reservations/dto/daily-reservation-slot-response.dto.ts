import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DailyReservationSlotResponseDto {
  @ApiProperty({
    description: 'Horario de la franja.',
    example: '20:00',
  })
  time!: string;

  @ApiProperty({
    description: 'Cantidad de personas reservadas para esa franja.',
    example: 12,
  })
  reserved!: number;

  @ApiProperty({
    description: 'Capacidad disponible para esa franja.',
    example: 30,
  })
  available!: number;

  @ApiProperty({
    description: 'Indica si la franja se encuentra cerrada operativamente.',
    example: false,
  })
  isClosed!: boolean;

  @ApiPropertyOptional({
    description: 'Motivo operativo del cierre parcial si aplica.',
    example: 'Evento privado',
    nullable: true,
  })
  reason!: string | null;
}
