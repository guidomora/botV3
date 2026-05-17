# WhatsApp Create Reservation Workflow

## Objetivo

Crear una reserva desde una conversacion de WhatsApp, pidiendo datos faltantes cuando sea necesario y confirmando solo si las reglas de negocio y disponibilidad lo permiten.

## Entrada

- Canal: WhatsApp via Twilio.
- Endpoint: `POST /bot/communication/queue`.
- Payload: webhook form-url-encoded de Twilio.
- Mensaje del usuario: texto natural solicitando una reserva.

## Participantes

- `WhatsAppController`
- `RequestSizeLimitMiddleware`
- `TwilioSignatureGuard`
- `WhatsAppIdempotencyGuard`
- `WhatsAppRateLimitGuard`
- `WhatsAppService`
- `ReservationsService`
- `AiService`
- `IntentionsRouter`
- `CreateReservationStrategy`
- `DatesService`
- `CreateReservationRowUseCase`
- `GoogleSheetsModule`
- `CacheContextModule`

## Flujo feliz

1. Twilio envia el webhook al endpoint de comunicacion.
2. El middleware valida tamano maximo de request.
3. Los guards validan firma Twilio, idempotencia y rate limit.
4. El controller normaliza el payload a un formato interno.
5. `WhatsAppService` agrupa mensajes en rafaga del mismo usuario.
6. `ReservationsService` procesa el mensaje agregado.
7. `AiService` clasifica la intencion y extrae datos de reserva.
8. `IntentionsRouter` selecciona `CreateReservationStrategy`.
9. La estrategia combina datos nuevos con contexto existente.
10. Si faltan datos, guarda contexto parcial y responde pidiendo solo lo faltante.
11. Si estan todos los datos, valida reglas de negocio.
12. Se valida disponibilidad contra Google Sheets.
13. Se crea la reserva confirmada.
14. Se limpia estado temporal asociado al flujo.
15. Se recalcula o actualiza disponibilidad.
16. El bot responde al usuario con la confirmacion.

## Datos leidos

- Payload de Twilio.
- Historial y estado conversacional del usuario.
- Datos parciales de hoja temporal, cuando existan.
- Reservas existentes para validar duplicidad.
- Disponibilidad y ocupacion por solapamiento.
- Variables de capacidad, buffer, duracion y limite de grupo.

## Datos escritos

- Estado conversacional en cache.
- Fila temporal si la reserva queda incompleta.
- Reserva confirmada en hoja principal si el flujo se completa.
- Disponibilidad recalculada o actualizada.
- Respuesta saliente por Twilio.

## Validaciones

- Firma Twilio valida.
- Mensaje no duplicado por `AccountSid + MessageSid`.
- Rate limit por `WaId`.
- Tamano de request permitido.
- Datos obligatorios completos antes de confirmar.
- No duplicar reserva por telefono y dia.
- No crear reservas en fecha u hora pasada.
- No automatizar reservas que superen `MAX_PEOPLE_PER_RESERVATION`.
- No superar capacidad online.

## Errores y contingencias

- Si el mensaje trae multimedia no soportada, se pide texto.
- Si faltan datos, se pide solo lo faltante.
- Si ya existe reserva para el mismo telefono y dia, se sugiere modificar.
- Si no hay disponibilidad, se responde con rechazo o alternativas cuando aplique.
- Si falla OpenAI o Google Sheets, no se confirma una reserva falsa.
- Si Twilio reintenta el mismo mensaje, idempotencia responde `200 { ok: true }` sin reprocesar.

## Archivos clave

- `src/modules/whatsapp/controller/whatsapp.controller.ts`
- `src/modules/whatsapp/service/whatsapp.service.ts`
- `src/modules/reservations/service/reservations.service.ts`
- `src/modules/reservations/service/intention/create-reservation.strategy.ts`
- `src/modules/dates/application/create-reservation.use-case.ts`
- `src/modules/google-sheets/service/google-sheets-reservations.service.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.ts`
- `src/modules/google-sheets/service/google-temporal-sheet.service.ts`
- `src/modules/cache-context/cache.service.ts`

## Tests relacionados

- `src/modules/whatsapp/controller/whatsapp.controller.spec.ts`
- `src/modules/whatsapp/service/whatsapp.service.spec.ts`
- `src/modules/reservations/service/intention/create-reservation.strategy.spec.ts`
- `src/modules/dates/application/create-reservation.use-case.spec.ts`
- `src/modules/google-sheets/service/google-sheets-reservations.service.spec.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.spec.ts`
