import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseDashboardSlotResponseDto {
  @ApiProperty({
    description: 'Fecha del cierre parcial en formato ISO.',
    example: '2026-04-16',
  })
  date!: string;

  @ApiProperty({
    description: 'Horario inicial consolidado del cierre parcial.',
    example: '13:00',
  })
  fromTime!: string;

  @ApiProperty({
    description: 'Horario final consolidado del cierre parcial.',
    example: '15:00',
  })
  toTime!: string;

  @ApiProperty({
    description: 'Indica si la franja quedo marcada como cerrada.',
    example: true,
  })
  isClosed!: true;

  @ApiPropertyOptional({
    description: 'Motivo operativo del cierre si se informo.',
    example: 'Evento privado',
    nullable: true,
  })
  reason!: string | null;

  @ApiProperty({
    description: 'Cantidad de reservas ya existentes afectadas por el cierre parcial.',
    example: 2,
  })
  existingReservationsCount!: number;

  @ApiProperty({
    description: 'Cantidad de notificaciones de cierre encoladas para reservas afectadas.',
    example: 2,
  })
  notificationsQueuedCount!: number;

  @ApiPropertyOptional({
    description:
      'Identificador de la operacion asincronica de notificaciones para consultar fallos posteriores.',
    example: 'op_456',
    nullable: true,
  })
  closureOperationId!: string | null;

  @ApiPropertyOptional({
    description: 'Warning operativo para el dashboard cuando ya existian reservas afectadas.',
    example:
      'La franja fue cerrada, pero no se pudieron encolar las notificaciones a las reservas afectadas.',
    nullable: true,
  })
  warning!: string | null;
}
