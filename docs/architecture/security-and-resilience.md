# Security And Resilience

Este documento resume los controles de seguridad y resiliencia del backend. Sirve como referencia antes de tocar endpoints, guards, rate limits, webhooks, jobs o integraciones externas.

## Principios

- Los webhooks publicos deben validar origen, tamano, duplicados y frecuencia.
- Los endpoints operativos deben estar autenticados y limitar reintentos.
- Las operaciones internas no deben quedar expuestas sin token o secret.
- Los reintentos de proveedores no deben generar operaciones duplicadas.
- Una falla temporal de proveedor no debe confirmarse como una operacion exitosa.

## Webhook de WhatsApp

Endpoint principal:

- `POST /bot/communication/queue`

Controles aplicados:

- `RequestSizeLimitMiddleware`
- `TwilioSignatureGuard`
- `WhatsAppIdempotencyGuard`
- `WhatsAppRateLimitGuard`

Archivos:

- `src/modules/whatsapp/controller/whatsapp.controller.ts`
- `src/modules/whatsapp/whatsapp.module.ts`
- `src/modules/whatsapp/middlewares/request-size-limit.middleware.ts`
- `src/modules/whatsapp/guards/twilio-signature.guard.ts`
- `src/modules/whatsapp/guards/whatsapp-idempotency.guard.ts`
- `src/modules/whatsapp/guards/whatsapp-rate-limit.guard.ts`

## Firma de Twilio

Guard:

- `TwilioSignatureGuard`

Header requerido:

- `x-twilio-signature`

Aplica a:

- `POST /bot/communication/queue`
- `POST /bot/communication/message-status`

Reglas:

- El header debe estar presente.
- La firma debe validarse contra la URL publica reconstruida y los parametros recibidos.
- La URL publica se arma usando `x-forwarded-proto`, `x-forwarded-host`, `host` y `originalUrl`.
- Si la firma falta o no valida, el request se rechaza con `ForbiddenException`.

Riesgo que mitiga:

- Requests falsos hacia webhooks de Twilio.
- Callbacks no autenticados.

## Idempotencia de WhatsApp

Guard:

- `WhatsAppIdempotencyGuard`

Servicio:

- `IdempotencyService`

Identificador:

- `AccountSid + MessageSid`

Variable relevante:

- `IDEMPOTENCY_MESSAGE_SID_TTL_MS`

Reglas:

- Si el payload no trae `AccountSid` o `MessageSid`, el guard no bloquea.
- Si el mensaje ya fue procesado, responde `200 { ok: true }` usando `HttpException`.
- Un duplicado no debe llegar al flujo de negocio.

Riesgo que mitiga:

- Reintentos de Twilio creando dos reservas, dos cancelaciones o dos respuestas inconsistentes.

## Rate limit de WhatsApp

Guard:

- `WhatsAppRateLimitGuard`

Servicio:

- `RateLimitService`

Scope:

- `WaId`

Variables:

- `RATE_LIMIT_SHORT_WINDOW_MS`
- `RATE_LIMIT_SHORT_WINDOW_LIMIT`
- `RATE_LIMIT_LONG_WINDOW_MS`
- `RATE_LIMIT_LONG_WINDOW_LIMIT`
- `RATE_LIMIT_BLOCK_WINDOW_MS`
- `RATE_LIMIT_NOTIFY_COOLDOWN_MS`

Reglas:

- Si el payload no trae `WaId`, el guard no bloquea.
- Si el mensaje esta permitido, continua el flujo.
- Si el rate limit bloquea, responde `200 { ok: true }` para cortar procesamiento sin forzar reintentos del proveedor.
- Si corresponde notificar, intenta enviar `RATE_LIMIT_MESSAGE`.
- Si falla la notificacion de rate limit, se loguea el error pero el bloqueo se mantiene.

Riesgo que mitiga:

- Spam o rafagas abusivas por usuario de WhatsApp.
- Costos innecesarios de IA y proveedores.
- Degradacion del flujo conversacional por exceso de mensajes.

## Limite de tamano de request

Middleware:

- `RequestSizeLimitMiddleware`

Aplica a:

- `POST /bot/communication/queue`

Constantes:

- `MAX_REQUEST_BODY_SIZE_BYTES = 100 * 1024`
- `WARNING_REQUEST_BODY_SIZE_BYTES = 75 * 1024`

Reglas:

- Si el request supera el umbral de warning, se loguea advertencia.
- Si supera el maximo, se rechaza con `PayloadTooLargeException`.
- El tamano se toma de `content-length` cuando existe; si no, se calcula desde `body`.

Riesgo que mitiga:

- Payloads demasiado grandes en el webhook publico.
- Uso excesivo de memoria o procesamiento innecesario.

## Agenda sync

Guard:

- `AgendaSyncGuard`

Headers requeridos:

- `x-agenda-sync-timestamp`
- `x-agenda-sync-signature`

Variables:

- `AGENDA_SYNC_SECRET`
- `AGENDA_SYNC_MAX_TIME_SKEW_MS`
- `AGENDA_SYNC_RATE_LIMIT_WINDOW_MS`
- `AGENDA_SYNC_RATE_LIMIT_MAX_REQUESTS`

Aplica a:

- `POST /bot/dates/ensure-agenda-window`
- `DELETE /bot/dates/delete-old-rows`

Reglas:

- `AGENDA_SYNC_SECRET` debe estar configurado.
- El timestamp debe estar dentro de la ventana permitida.
- La firma HMAC debe validarse usando metodo, path normalizado, timestamp y secret.
- La misma firma no puede reutilizarse dentro del TTL de replay.
- El scope de rate limit base es `agenda-sync`.
- Si falla cualquier validacion, se rechaza con `ForbiddenException`.

Servicios:

- `AgendaSyncSecurityService`
- `AgendaSyncReplayService`
- `AgendaSyncRateLimitService`

Riesgo que mitiga:

- Ejecucion no autorizada de mantenimiento de agenda.
- Replay de requests firmados.
- Abuso de endpoints automaticos.

## Endpoints manuales de dates

Guard:

- `DatesManualGuard`

Hereda de:

- `AgendaSyncGuard`

Aplica a:

- `POST /bot/dates`
- `POST /bot/dates/next-date`
- `POST /bot/dates/x-dates`

Reglas:

- Usa la misma validacion de secret, timestamp, firma HMAC, replay y rate limit que `AgendaSyncGuard`.
- Cambia el label del endpoint a `manual de dates`.
- Cambia el scope de rate limit a `dates-manual:<path>`.
- Devuelve mensaje especifico cuando excede rate limit manual.

Variables:

- `DATES_MANUAL_RATE_LIMIT_WINDOW_MS`
- `DATES_MANUAL_RATE_LIMIT_MAX_REQUESTS`

Riesgo que mitiga:

- Uso no autorizado de endpoints operativos manuales.
- Creacion accidental o abusiva de dias de agenda.

## Dashboard interno de reservas

Guard:

- `InternalApiTokenGuard`

Header requerido:

- `x-internal-api-token`

Variable:

- `INTERNAL_API_TOKEN`

Aplica a:

- Endpoints bajo `Controller('reservations')`, publicados como `/bot/reservations`.

Reglas:

- `INTERNAL_API_TOKEN` debe estar configurado.
- El request debe enviar `x-internal-api-token`.
- El token recibido debe coincidir exactamente con el esperado.
- Si falta configuracion o el token es invalido, se rechaza con `ForbiddenException`.

Riesgo que mitiga:

- Acceso publico a operaciones internas de dashboard.
- Altas, bajas, modificaciones o cierres de agenda no autorizados.

## Health checks

Guards:

- `HealthSecretGuard`
- `HealthRateLimitGuard`

Header requerido:

- `x-health-secret`

Variables:

- `HEALTH_CHECK_SECRET`
- `HEALTH_CHECK_RATE_LIMIT_MAX_REQUESTS`

Aplica a:

- `GET /bot/health/live`
- `GET /bot/health/ready`

Reglas:

- `HEALTH_CHECK_SECRET` debe estar configurado.
- El request debe enviar `x-health-secret`.
- El secret recibido debe coincidir con el configurado.
- El rate limit se aplica por IP resuelta desde `x-forwarded-for`, `request.ip` o `remoteAddress`.
- La ventana de rate limit de health es de 60 segundos.
- Si se excede el limite, responde `429 Too Many Requests`.

Riesgo que mitiga:

- Exposicion publica de endpoints operativos.
- Abuso de probes de health.

## Manejo de fallos de proveedores

Proveedores principales:

- Twilio.
- OpenAI.
- Google Sheets.
- Redis para jobs.

Reglas:

- No confirmar una reserva si la persistencia en Google Sheets falla.
- No informar disponibilidad como definitiva si no pudo validarse contra la fuente operativa.
- No tratar fallas de notificacion como exito silencioso cuando afectan una operacion observable.
- Encapsular errores temporales de proveedor y responder con contingencia cuando aplique.
- Loguear fallos tecnicos sin exponer detalles internos al usuario final.

Riesgo que mitiga:

- Confirmaciones falsas.
- Estados divergentes entre conversacion, cache y hojas.
- Fugas de informacion tecnica en respuestas al usuario.

## Checklist antes de cambiar seguridad

Antes de modificar un guard, middleware o endpoint protegido, revisar:

1. Que rutas quedan protegidas.
2. Que headers o tokens requiere el cliente.
3. Que pasa con reintentos del proveedor.
4. Que status HTTP espera el integrador externo.
5. Que estado temporal se escribe antes y despues del guard.
6. Que variables de entorno deben existir.
7. Que pruebas cubren caso valido, falta de credencial, credencial invalida y rate limit.
