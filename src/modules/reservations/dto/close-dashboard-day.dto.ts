import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CloseDashboardDayDto {
  @ApiPropertyOptional({
    description: 'Motivo opcional del cierre para uso operativo interno.',
    example: 'Cerrado por mantenimiento',
  })
  @IsOptional()
  @IsString({ message: 'reason must be a string' })
  reason?: string;
}
