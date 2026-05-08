import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class FailedClosureNotificationDto {
  @ApiProperty({
    description: 'Nombre de la reserva cuyo envio fallo.',
    example: 'Juan Perez',
  })
  name!: string;

  @ApiProperty({
    description: 'Telefono normalizado de la reserva afectada.',
    example: '5491122334455',
  })
  phone!: string;

  @ApiProperty({
    description: 'Fecha original de la reserva afectada.',
    example: 'jueves 16 de abril 2026 16/04/2026',
  })
  date!: string;

  @ApiProperty({
    description: 'Horario original de la reserva afectada.',
    example: '21:00',
  })
  time!: string;
}

export class ClosureNotificationFailuresResponseDto {
  @ApiProperty({
    description: 'Indica si la operacion ya termino de procesar todas las notificaciones.',
    example: true,
  })
  isCompleted!: boolean;

  @ApiPropertyOptional({
    description: 'Indica si hubo al menos un envio fallido cuando la operacion ya finalizo.',
    example: true,
  })
  hasFailures?: boolean;

  @ApiPropertyOptional({
    description: 'Listado de reservas cuyo envio de WhatsApp fallo al finalizar la operacion.',
    type: FailedClosureNotificationDto,
    isArray: true,
  })
  failedNotifications?: FailedClosureNotificationDto[];
}
