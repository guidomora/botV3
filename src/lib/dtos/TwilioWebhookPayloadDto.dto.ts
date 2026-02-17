import { IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class TwilioWebhookPayloadDto {
  @IsString()
  @IsNotEmpty()
  Body!: string;

  @IsString()
  @IsNotEmpty()
  From!: string;

  @IsString()
  @IsNotEmpty()
  To!: string;

  @IsString()
  @IsNotEmpty()
  WaId!: string;

  @IsString()
  @IsOptional()
  ProfileName?: string;

  @IsString()
  @IsNotEmpty()
  MessageSid!: string;

  @IsString()
  @IsNotEmpty()
  AccountSid!: string;

  @IsNumberString()
  @IsOptional()
  NumMedia?: string;

  @IsString()
  @IsOptional()
  MessageType?: string;

  @IsString()
  @IsOptional()
  ChannelMetadata?: string;
}