# Request Flow

Este documento describe los flujos tecnicos principales del backend. Todas las rutas publicas usan el prefijo global `/bot`.

## Webhook conversacional de WhatsApp

Entrada principal:

- `POST /bot/communication/queue`

Flujo:

1. Twilio envia un webhook `application/x-www-form-urlencoded`.
2. `RequestSizeLimitMiddleware` valida el tamano maximo del request.
3. `TwilioSignatureGuard` valida `x-twilio-signature`.
4. `WhatsAppIdempotencyGuard` evita procesar dos veces el mismo `MessageSid`.
5. `WhatsAppRateLimitGuard` aplica rate limit por usuario de WhatsApp.
6. `WhatsAppController` normaliza el payload a `SimplifiedTwilioWebhookPayload`.
7. Si el mensaje trae multimedia no soportado, `WhatsAppService` responde con un mensaje de contingencia.
8. Si el mensaje es texto soportado, `WhatsAppService.handleMultipleMessages` agrega mensajes cercanos del mismo usuario.
9. El mensaje agregado se envia a `ReservationsService`.
10. `ReservationsService` usa IA y contexto conversacional para resolver intencion y datos disponibles.
11. `IntentionsRouter` selecciona la estrategia correspondiente.
12. La estrategia ejecuta reglas de negocio, cache y persistencia segun el caso.
13. Se genera una respuesta conversacional.
14. `WhatsAppService` envia la respuesta por Twilio.
15. El controller responde `200 { ok: true }` a Twilio.

Archivos clave:

- `src/modules/whatsapp/controller/whatsapp.controller.ts`
- `src/modules/whatsapp/service/whatsapp.service.ts`
- `src/modules/reservations/service/reservations.service.ts`
- `src/modules/reservations/service/intention/intention.router.ts`
- `src/modules/reservations/service/intention/*.strategy.ts`

## Seleccion de intencion

La seleccion de intencion ocurre dentro del modulo `reservations`.

Participantes:

- `ReservationsService`
- `AiService`
- `IntentionsRouter`
- Estrategias de intencion
- `CacheContextModule`

Flujo conceptual:

1. Se recupera contexto previo del usuario.
2. Se clasifica o actualiza la intencion con ayuda de IA.
3. Se combinan datos nuevos del mensaje con datos ya conocidos del flujo.
4. Se selecciona una estrategia por intencion.
5. La estrategia decide si necesita pedir datos faltantes o ejecutar una operacion final.

Estrategias actuales:

- `CreateReservationStrategy`
- `AvailabilityStrategy`
- `UpdateReservationStrategy`
- `DeleteReservationStrategy`
- `OtherStrategy`

## Crear reserva desde WhatsApp

Flujo de alto nivel:

1. El usuario pide una reserva por WhatsApp.
2. El bot extrae fecha, hora, nombre, telefono y cantidad.
3. Si faltan datos, se guardan datos parciales en contexto/cache y hoja temporal.
4. Si la reserva esta completa, se validan reglas de negocio.
5. Se consulta disponibilidad real contra Google Sheets.
6. Si hay capacidad, se crea la reserva definitiva.
7. Se elimina o actualiza el estado temporal.
8. Se recalcula disponibilidad.
9. Se confirma al usuario.

Archivos clave:

- `src/modules/reservations/service/intention/create-reservation.strategy.ts`
- `src/modules/dates/application/create-reservation.use-case.ts`
- `src/modules/google-sheets/service/google-sheets-reservations.service.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.ts`
- `src/modules/google-sheets/service/google-temporal-sheet.service.ts`

## Consultar disponibilidad

Flujo de alto nivel:

1. El usuario consulta disponibilidad por fecha, horario o rango.
2. La estrategia de disponibilidad interpreta la consulta.
3. Se consulta agenda y disponibilidad en Google Sheets.
4. Si el horario exacto no esta disponible, se pueden sugerir horarios cercanos.
5. Se responde al usuario con opciones o resultado final.

Archivos clave:

- `src/modules/reservations/service/intention/availability-reservation.strategy.ts`
- `src/modules/ai/prompts/availability-prompt.ts`
- `src/modules/ai/prompts/search-availability.prompt.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.ts`

## Modificar reserva

Flujo de alto nivel:

1. El usuario pide modificar una reserva.
2. El bot identifica la reserva original.
3. Si faltan datos para localizarla, los solicita.
4. Una vez localizada, extrae los cambios pedidos.
5. Se revalidan reglas de fecha, horario, capacidad y disponibilidad.
6. Se actualiza la reserva en Google Sheets.
7. Se recalcula disponibilidad.
8. Se confirma al usuario.

Archivos clave:

- `src/modules/reservations/service/intention/update-reservation.strategy.ts`
- `src/modules/dates/application/update-reservation.use-case.ts`
- `src/modules/ai/prompts/update-reservation.prompt.ts`
- `src/modules/ai/prompts/update-extraction.prompt.ts`

## Cancelar reserva

Flujo de alto nivel:

1. El usuario pide cancelar una reserva.
2. El bot recolecta datos minimos para ubicarla.
3. Se busca la reserva en Google Sheets.
4. Si existe y puede cancelarse, se elimina o limpia la fila correspondiente.
5. Se recalcula disponibilidad.
6. Se confirma la cancelacion.

Archivos clave:

- `src/modules/reservations/service/intention/delete-reservation.strategy.ts`
- `src/modules/dates/application/delete-reservation.use-case.ts`
- `src/modules/ai/prompts/cancel-prompt.ts`
- `src/modules/ai/prompts/cancel-reservation-result.prompt.ts`

## Dashboard interno de reservas

Entrada principal:

- `Controller('reservations')`, bajo `/bot/reservations`.

Proteccion:

- `InternalApiTokenGuard`
- Header `INTERNAL_API_TOKEN_HEADER`

Capacidades:

- Crear reserva.
- Editar reserva.
- Eliminar reserva.
- Consultar fechas disponibles.
- Consultar slots diarios.
- Consultar resumen diario.
- Cerrar o reabrir dias.
- Cerrar o reabrir franjas.
- Consultar fallos de notificaciones de cierre.

Archivos clave:

- `src/modules/reservations/controller/reservations.controller.ts`
- `src/modules/reservations/service/reservations-dashboard.service.ts`
- `src/modules/reservations/application/*.use-case.ts`

## Operaciones de agenda

Entrada principal:

- `Controller('dates')`, bajo `/bot/dates`.

Protecciones:

- `DatesManualGuard` para operaciones manuales.
- `AgendaSyncGuard` para operaciones automaticas firmadas.

Flujos principales:

- Crear un nuevo dia.
- Crear el proximo dia faltante.
- Crear multiples dias.
- Asegurar ventana futura de agenda.
- Eliminar filas historicas antiguas.

Archivos clave:

- `src/modules/dates/controller/dates.controller.ts`
- `src/modules/dates/service/dates.service.ts`
- `src/modules/dates/application/ensure-agenda-window.use-case.ts`
- `src/modules/dates/guards/agenda-sync.guard.ts`
- `src/modules/dates/guards/dates-manual.guard.ts`

## Callbacks de estado de Twilio

Entrada principal:

- `POST /bot/communication/message-status`

Flujo:

1. Twilio envia un callback con estado de mensaje saliente.
2. `TwilioSignatureGuard` valida la firma.
3. `WhatsAppController` recibe el payload.
4. `ClosureNotificationOperationService` actualiza el estado de la operacion asociada.

Archivos clave:

- `src/modules/whatsapp/controller/whatsapp.controller.ts`
- `src/modules/reservation-jobs/service/closure-notification-operation.service.ts`

## Health checks

Entradas principales:

- `GET /bot/health/live`
- `GET /bot/health/ready`

Proteccion:

- `HealthSecretGuard`
- `HealthRateLimitGuard`

Flujo:

1. Se valida el header secreto.
2. Se aplica rate limit.
3. `live` confirma que el proceso responde.
4. `ready` valida configuracion critica y dependencias externas necesarias.
5. Si readiness falla, se responde con `ServiceUnavailableException`.

Archivos clave:

- `src/modules/health/controller/health.controller.ts`
- `src/modules/health/service/health.service.ts`
