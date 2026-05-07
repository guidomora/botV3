import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { TwilioOutboundMessageStatus } from '../types/twilio';

export class TwilioMessageStatusCallbackDto {
  @ApiProperty({
    description: 'Identificador del mensaje asignado por Twilio.',
    example: 'SM1342fe1b2c904d1ab04f0fc7a58abca9',
  })
  @IsString()
  MessageSid!: string;

  @ApiProperty({
    description: 'Estado actual del mensaje reportado por Twilio.',
    enum: ['accepted', 'queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'undelivered'],
    example: 'delivered',
  })
  @IsIn(['accepted', 'queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'undelivered'])
  MessageStatus!: TwilioOutboundMessageStatus;

  @ApiPropertyOptional({
    description: 'Codigo de error reportado por Twilio cuando el mensaje falla.',
    example: '63016',
  })
  @IsOptional()
  @IsString()
  ErrorCode?: string;

  @ApiPropertyOptional({
    description: 'Descripcion del error reportado por Twilio cuando el mensaje falla.',
    example: 'Failed to send',
  })
  @IsOptional()
  @IsString()
  ErrorMessage?: string;
}
