import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseDashboardDayResponseDto {
  @ApiProperty({
    description: 'Fecha del dia cerrado en formato ISO.',
    example: '2026-04-16',
  })
  date!: string;

  @ApiProperty({
    description: 'Indica si la fecha quedo marcada como cerrada.',
    example: true,
  })
  isClosed!: true;

  @ApiPropertyOptional({
    description: 'Motivo operativo del cierre si se informo.',
    example: 'Cerrado por mantenimiento',
    nullable: true,
  })
  reason!: string | null;

  @ApiProperty({
    description: 'Cantidad de reservas ya existentes para esa fecha.',
    example: 3,
  })
  existingReservationsCount!: number;

  @ApiProperty({
    description: 'Cantidad de notificaciones de cierre encoladas para reservas afectadas.',
    example: 3,
  })
  notificationsQueuedCount!: number;

  @ApiPropertyOptional({
    description: 'Warning operativo para el dashboard cuando ya existian reservas.',
    example:
      'La fecha fue cerrada, pero no se pudieron encolar las notificaciones a las reservas afectadas.',
    nullable: true,
  })
  warning!: string | null;
}
