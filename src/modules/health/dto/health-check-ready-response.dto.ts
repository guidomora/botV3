import { ApiProperty } from '@nestjs/swagger';

class HealthCheckReadyChecksDto {
  @ApiProperty({
    description: 'Estado de la configuracion minima requerida para operar.',
    enum: ['ok', 'error', 'disabled'],
    example: 'ok',
  })
  config!: 'ok' | 'error' | 'disabled';

  @ApiProperty({
    description: 'Estado de acceso a Google Sheets.',
    enum: ['ok', 'error', 'disabled'],
    example: 'ok',
  })
  googleSheets!: 'ok' | 'error' | 'disabled';

  @ApiProperty({
    description: 'Estado de conectividad a PostgreSQL.',
    enum: ['ok', 'error', 'disabled'],
    example: 'ok',
  })
  postgres!: 'ok' | 'error' | 'disabled';

  @ApiProperty({
    description:
      'Estado de Redis para reservation-jobs. Puede quedar disabled mientras la infraestructura no este habilitada.',
    enum: ['ok', 'error', 'disabled'],
    example: 'disabled',
  })
  redis!: 'ok' | 'error' | 'disabled';
}

export class HealthCheckReadyResponseDto {
  @ApiProperty({
    description: 'Estado general del endpoint de readiness.',
    enum: ['ok', 'error'],
    example: 'ok',
  })
  status!: 'ok' | 'error';

  @ApiProperty({
    description: 'Tipo de health check ejecutado.',
    example: 'readiness',
  })
  type!: 'readiness';

  @ApiProperty({
    description: 'Marca de tiempo ISO 8601 del momento del chequeo.',
    example: '2026-04-02T15:04:05.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Detalle por dependencia critica evaluada por el readiness check.',
    type: HealthCheckReadyChecksDto,
  })
  checks!: HealthCheckReadyChecksDto;
}
