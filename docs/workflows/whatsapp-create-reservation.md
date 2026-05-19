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
- `WhatsAppUsageLimitGuard`
- `WhatsAppRateLimitGuard`
- `WhatsAppService`
- `ReservationsService`
- `AiService`
- `IntentionsRouter`
- `CreateReservationStrategy`
- `BillingUsageModule`
- `DatesService`
- `CreateReservationRowUseCase`
- `GoogleSheetsModule`
- `CacheContextModule`

## Flujo feliz

1. Twilio envia el webhook al endpoint de comunicacion.
2. El middleware valida tamano maximo de request.
3. Los guards validan firma Twilio e idempotencia.
4. `WhatsAppUsageLimitGuard` valida cupo mensual antes de rate limit, controller, OpenAI y orquestacion.
5. Si no hay cupo o no se puede validar PostgreSQL, responde por Twilio con derivacion manual y corta el request con `200 { ok: true }`.
6. Si hay cupo disponible, continua el flujo normal y `WhatsAppRateLimitGuard` aplica el rate limit.
7. El controller normaliza el payload a un formato interno.
8. `WhatsAppService` agrupa mensajes en rafaga del mismo usuario.
9. `ReservationsService` procesa el mensaje agregado.
10. `AiService` clasifica la intencion y extrae datos de reserva.
11. `IntentionsRouter` selecciona `CreateReservationStrategy`.
12. La estrategia combina datos nuevos con contexto existente.
13. Si faltan datos, guarda contexto parcial y responde pidiendo solo lo faltante.
14. Si estan todos los datos, valida reglas de negocio.
15. Se consume cupo mensual WhatsApp en PostgreSQL de forma atomica.
16. Si el cupo se agoto entre el pre-check y la confirmacion, no se encola la creacion y se responde con derivacion manual.
17. Se valida disponibilidad contra Google Sheets.
18. Se crea la reserva confirmada.
19. Si la cola no llega a encolar o la creacion responde con error despues de consumir cupo, se libera el consumo reservado.
20. Si el job ya fue encolado y falla la espera del resultado, se conserva el consumo porque la reserva podria completarse asincronicamente.
21. Se limpia estado temporal asociado al flujo.
22. Se recalcula o actualiza disponibilidad.
23. El bot responde al usuario con la confirmacion.

## Datos leidos

- Payload de Twilio.
- Historial y estado conversacional del usuario.
- Datos parciales de hoja temporal, cuando existan.
- Reservas existentes para validar duplicidad.
- Disponibilidad y ocupacion por solapamiento.
- Variables de capacidad, buffer, duracion y limite de grupo.
- Suscripcion, plan y consumo mensual en PostgreSQL.

## Datos escritos

- Estado conversacional en cache.
- Fila temporal si la reserva queda incompleta.
- Reserva confirmada en hoja principal si el flujo se completa.
- Evento de uso y agregado mensual en PostgreSQL para reservas completas creadas desde WhatsApp.
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
- No superar el cupo mensual de reservas WhatsApp del plan activo.
- Si el cupo mensual esta agotado, no procesar nuevos mensajes WhatsApp para evitar costos conversacionales.

## Errores y contingencias

- Si el mensaje trae multimedia no soportada, se pide texto.
- Si faltan datos, se pide solo lo faltante.
- Si ya existe reserva para el mismo telefono y dia, se sugiere modificar.
- Si no hay suscripcion activa, el plan esta inactivo, el cupo mensual esta agotado o PostgreSQL no puede validar cupo, se bloquea temprano el mensaje WhatsApp y se deriva a atencion manual.
- Si no hay disponibilidad, se responde con rechazo o alternativas cuando aplique.
- Si falla la cola antes de encolar o la creacion responde con error despues de consumir cupo, se intenta liberar el consumo reservado.
- Si falla la espera de un job ya encolado, no se libera automaticamente el consumo para evitar subcontabilizar reservas con resultado desconocido.
- Si falla OpenAI o Google Sheets, no se confirma una reserva falsa.
- Si Twilio reintenta el mismo mensaje, idempotencia responde `200 { ok: true }` sin reprocesar.

## Archivos clave

- `src/modules/whatsapp/controller/whatsapp.controller.ts`
- `src/modules/whatsapp/guards/whatsapp-usage-limit.guard.ts`
- `src/modules/whatsapp/service/whatsapp.service.ts`
- `src/modules/reservations/service/reservations.service.ts`
- `src/modules/reservations/service/intention/create-reservation.strategy.ts`
- `src/modules/billing-usage/service/usage-limit.service.ts`
- `src/modules/dates/application/create-reservation.use-case.ts`
- `src/modules/google-sheets/service/google-sheets-reservations.service.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.ts`
- `src/modules/google-sheets/service/google-temporal-sheet.service.ts`
- `src/modules/cache-context/cache.service.ts`

## Tests relacionados

- `src/modules/whatsapp/controller/whatsapp.controller.spec.ts`
- `src/modules/whatsapp/guards/whatsapp-usage-limit.guard.spec.ts`
- `src/modules/whatsapp/service/whatsapp.service.spec.ts`
- `src/modules/reservations/service/intention/create-reservation.strategy.spec.ts`
- `src/modules/billing-usage/service/usage-limit.service.spec.ts`
- `src/modules/dates/application/create-reservation.use-case.spec.ts`
- `src/modules/google-sheets/service/google-sheets-reservations.service.spec.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.spec.ts`
