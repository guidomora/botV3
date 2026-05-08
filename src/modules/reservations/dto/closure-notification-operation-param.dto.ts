import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ClosureNotificationOperationParamDto {
  @ApiProperty({
    description: 'Identificador de la operacion de cierre a consultar.',
    example: 'op_123',
  })
  @IsString()
  @MinLength(1)
  operationId!: string;
}
