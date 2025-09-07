import { Controller, Post, Body, Get, Query, Delete } from '@nestjs/common';
import { WhatsAppService } from '../service/whats-app.service';

@Controller('communication')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post()
  create(): Promise<string> {
    return this.whatsappService.createReservation();
  }
}
