import { Controller, Post, Body, Headers, ForbiddenException, Req } from '@nestjs/common';
import { WhatsAppService } from '../service/whats-app.service';

@Controller('communication')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  // @Post()
  // create(): Promise<string> {
  //   return this.whatsappService.createReservation();
  // }

  @Post()
  async inbound(
    @Req() req: Request,
    @Body() body: Record<string, string>,
    @Headers('x-twilio-signature') signature: string,
  ) {
    // // 1) Reconstruí la URL pública de tu webhook (o léela de env para mayor fiabilidad)
    // const publicBaseUrl = process.env.PUBLIC_BASE_URL; // ej: https://tu-ngrok.ngrok.io
    // const url = `${publicBaseUrl}${req.originalUrl}`;

    // // 2) Verificá firma
    // const ok = this.whatsappService.verifySignature(url, body, signature);
    // if (!ok) throw new ForbiddenException('Invalid Twilio signature');

    // 3) Procesá el mensaje entrante
    await this.whatsappService.handleInboundMessage(body);

    // 4) Respondé 200 OK sin cuerpo (Twilio queda conforme)
    return { ok: true };
  }
}
