import { ApiProperty } from '@nestjs/swagger';

export class EnsureAgendaWindowResponseDto {
  @ApiProperty({
    description: 'Cantidad objetivo de dias futuros que la agenda debe mantener abiertos.',
    example: 15,
  })
  targetDaysAhead!: number;

  @ApiProperty({
    description: 'Cobertura actual de dias ya disponibles antes de ejecutar la sincronizacion.',
    example: 14,
  })
  currentCoverageDays!: number;

  @ApiProperty({
    description: 'Cantidad de dias faltantes detectados para llegar al objetivo.',
    example: 1,
  })
  missingDays!: number;

  @ApiProperty({
    description: 'Cantidad de dias efectivamente creados por la operacion.',
    example: 1,
  })
  createdDays!: number;

  @ApiProperty({
    description: 'Ultima fecha registrada en la agenda luego del proceso.',
    nullable: true,
    example: 'domingo 30 de marzo 2026 30/03/2026',
  })
  lastRegisteredDate!: string | null;

  @ApiProperty({
    description: 'Resumen textual del resultado de la sincronizacion.',
    example: 'Se agregaron 1 dias para completar 15 dias de agenda.',
  })
  message!: string;
}
