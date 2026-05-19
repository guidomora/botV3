# Module Map

Este documento resume los modulos principales de `src/modules` y sus responsabilidades. Sirve como punto de partida para ubicar el codigo antes de implementar cambios.

## AppModule

Archivo principal: `src/app.module.ts`

Responsabilidad:

- Registrar los modulos de la aplicacion.
- Cargar configuracion global desde `.env`.
- Validar variables de entorno con `validateEnvironmentVariables`.

Modulos importados:

- `ReservationsModule`
- `GoogleSheetsModule`
- `ConfigModule`
- `DatesModule`
- `AiModule`
- `WhatsAppModule`
- `CacheContextModule`
- `ReservationJobsModule`
- `DatabaseModule`
- `BillingUsageModule`
- `HealthModule`

## WhatsAppModule

Archivo principal: `src/modules/whatsapp/whatsapp.module.ts`

Responsabilidad:

- Exponer los webhooks HTTP de Twilio.
- Validar firma, idempotencia, cupo mensual, rate limit y tamano maximo de request.
- Cortar mensajes entrantes antes de OpenAI/orquestacion si el cupo mensual no permite continuar.
- Agrupar mensajes entrantes enviados en rafaga.
- Enviar respuestas salientes por WhatsApp.

Entradas principales:

- `POST /bot/communication/queue`
- `POST /bot/communication/message-status`

Dependencias:

- `ReservationsModule` para procesar mensajes conversacionales.
- `ReservationJobsModule` para actualizar operaciones asociadas a callbacks de estado.
- `BillingUsageModule` para validar cupo antes de procesar mensajes WhatsApp.
- Configuracion de Twilio desde `twilio.config`.

Archivos clave:

- `src/modules/whatsapp/controller/whatsapp.controller.ts`
- `src/modules/whatsapp/service/whatsapp.service.ts`
- `src/modules/whatsapp/adapters/twilio.adapter.ts`
- `src/modules/whatsapp/guards/twilio-signature.guard.ts`
- `src/modules/whatsapp/guards/whatsapp-idempotency.guard.ts`
- `src/modules/whatsapp/guards/whatsapp-usage-limit.guard.ts`
- `src/modules/whatsapp/guards/whatsapp-rate-limit.guard.ts`
- `src/modules/whatsapp/middlewares/request-size-limit.middleware.ts`

## ReservationsModule

Archivo principal: `src/modules/reservations/reservations.module.ts`

Responsabilidad:

- Orquestar el flujo conversacional de reservas.
- Resolver la intencion del usuario.
- Delegar cada intencion a una estrategia concreta.
- Exponer endpoints internos para dashboard de reservas.

Intenciones conversacionales:

- Crear reserva.
- Consultar disponibilidad.
- Modificar reserva.
- Cancelar reserva.
- Responder consultas fuera de alcance.

Dependencias:

- `DatesModule` para operaciones de negocio sobre reservas y agenda.
- `AiModule` para clasificacion y extraccion de datos.
- `GoogleSheetsModule` para lectura/escritura de reservas y disponibilidad.
- `CacheContextModule` para historial y estado temporal conversacional.
- `ReservationJobsModule` para jobs vinculados a operaciones del dashboard.
- `BillingUsageModule` para limitar nuevas reservas creadas desde WhatsApp.

Archivos clave:

- `src/modules/reservations/service/reservations.service.ts`
- `src/modules/reservations/service/intention/intention.router.ts`
- `src/modules/reservations/service/intention/create-reservation.strategy.ts`
- `src/modules/reservations/service/intention/availability-reservation.strategy.ts`
- `src/modules/reservations/service/intention/update-reservation.strategy.ts`
- `src/modules/reservations/service/intention/delete-reservation.strategy.ts`
- `src/modules/reservations/service/intention/other.strategy.ts`
- `src/modules/reservations/controller/reservations.controller.ts`
- `src/modules/reservations/service/reservations-dashboard.service.ts`
- `src/modules/reservations/application/*.use-case.ts`

## DatabaseModule

Archivo principal: `src/modules/database/database.module.ts`

Responsabilidad:

- Configurar la conexion TypeORM contra PostgreSQL.
- Exponer `DatabaseHealthService` para readiness.
- Centralizar infraestructura SQL usada por modulos de plataforma.

Dependencias:

- `ConfigModule`
- Variables `DATABASE_*`

Archivos clave:

- `src/modules/database/database.module.ts`
- `src/modules/database/service/database-health.service.ts`
- `src/database/data-source.ts`
- `src/database/migrations/*`

## BillingUsageModule

Archivo principal: `src/modules/billing-usage/billing-usage.module.ts`

Responsabilidad:

- Persistir cuenta, plan, suscripcion y consumo mensual.
- Validar si el canal WhatsApp puede continuar procesando mensajes antes de generar costo conversacional.
- Consumir cupo de reservas WhatsApp de forma atomica.
- Liberar cupo si la creacion de reserva falla despues de reservar consumo.

Dependencias:

- PostgreSQL via TypeORM.

Archivos clave:

- `src/modules/billing-usage/service/usage-limit.service.ts`
- `src/modules/billing-usage/service/billing-period.service.ts`
- `src/modules/billing-usage/entities/*`
- `src/lib/types/billing-usage/*`

## AiModule

Archivo principal: `src/modules/ai/ai.module.ts`

Responsabilidad:

- Integrar llamadas a OpenAI.
- Clasificar intenciones.
- Extraer datos estructurados desde mensajes naturales.
- Generar respuestas conversacionales.

Dependencias:

- Configuracion de proveedor de IA.
- Prompts especializados por caso de uso.

Archivos clave:

- `src/modules/ai/service/ai.service.ts`
- `src/modules/ai/prompts/*.ts`
- `src/lib/types/ai-response/*`

## DatesModule

Archivo principal: `src/modules/dates/dates.module.ts`

Responsabilidad:

- Ejecutar casos de uso de negocio sobre agenda y reservas.
- Crear, modificar y eliminar reservas.
- Crear dias de agenda.
- Asegurar ventana futura de agenda.
- Limpiar filas historicas antiguas.
- Proteger endpoints operativos manuales y automaticos.

Entradas principales:

- `POST /bot/dates`
- `POST /bot/dates/next-date`
- `POST /bot/dates/x-dates`
- `POST /bot/dates/ensure-agenda-window`
- `DELETE /bot/dates/delete-old-rows`

Dependencias:

- `GoogleSheetsModule` para persistencia.
- `CacheModule` de Nest para protecciones operativas.

Archivos clave:

- `src/modules/dates/service/dates.service.ts`
- `src/modules/dates/application/create-day.use-case.ts`
- `src/modules/dates/application/create-reservation.use-case.ts`
- `src/modules/dates/application/update-reservation.use-case.ts`
- `src/modules/dates/application/delete-reservation.use-case.ts`
- `src/modules/dates/application/ensure-agenda-window.use-case.ts`
- `src/modules/dates/adapters/google-sheets-dates-sheet.adapter.ts`
- `src/modules/dates/adapters/google-sheets-temporal.adapter.ts`
- `src/modules/dates/guards/agenda-sync.guard.ts`
- `src/modules/dates/guards/dates-manual.guard.ts`

## GoogleSheetsModule

Archivo principal: `src/modules/google-sheets/google-sheets.module.ts`

Responsabilidad:

- Encapsular el acceso a Google Sheets.
- Leer y escribir reservas confirmadas.
- Leer y escribir disponibilidad por fecha/franja.
- Gestionar datos temporales de conversaciones incompletas.
- Consultar cierres de dias o franjas horarias.

Dependencias:

- Credenciales y configuracion de Google Sheets.

Archivos clave:

- `src/modules/google-sheets/service/google-sheets.service.ts`
- `src/modules/google-sheets/service/google-sheets-reservations.service.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.ts`
- `src/modules/google-sheets/service/google-temporal-sheet.service.ts`
- `src/modules/google-sheets/service/google-sheets-closed-schedule.service.ts`
- `src/lib/types/google-sheet/*`

## CacheContextModule

Archivo principal: `src/modules/cache-context/cache.module.ts`

Responsabilidad:

- Mantener historial conversacional por usuario.
- Persistir estado temporal de flujos en progreso.
- Aplicar expiracion de conversaciones.
- Notificar o limpiar datos cuando un ciclo conversacional expira.

Dependencias:

- Cache configurado para el runtime del bot.
- Servicios que consumen o actualizan contexto conversacional.

Archivos clave:

- `src/modules/cache-context/cache.service.ts`
- `src/modules/cache-context/cache-monitor.service.ts`
- `src/modules/cache-context/conversation-expiration-notifier.service.ts`
- `src/lib/types/cache/*`

## ReservationJobsModule

Archivo principal: `src/modules/reservation-jobs/reservation-jobs.module.ts`

Responsabilidad:

- Gestionar colas y workers para operaciones asincronas de reservas.
- Procesar altas, modificaciones y bajas cuando corresponda usar jobs.
- Procesar notificaciones asociadas a cierres de agenda.
- Centralizar la conexion Redis usada por estos jobs.

Dependencias:

- `DatesModule` para ejecutar operaciones de agenda/reserva.
- `CacheContextModule` para estado asociado a operaciones.
- Configuracion de Twilio para notificaciones salientes.
- Redis para colas.

Archivos clave:

- `src/modules/reservation-jobs/service/reservation-jobs-redis.service.ts`
- `src/modules/reservation-jobs/service/create-reservation-queue.service.ts`
- `src/modules/reservation-jobs/service/create-reservation-worker.service.ts`
- `src/modules/reservation-jobs/service/update-reservation-queue.service.ts`
- `src/modules/reservation-jobs/service/update-reservation-worker.service.ts`
- `src/modules/reservation-jobs/service/delete-reservation-queue.service.ts`
- `src/modules/reservation-jobs/service/delete-reservation-worker.service.ts`
- `src/modules/reservation-jobs/service/closure-notification-queue.service.ts`
- `src/modules/reservation-jobs/service/closure-notification-worker.service.ts`
- `src/modules/reservation-jobs/service/closure-notification-operation.service.ts`

## HealthModule

Archivo principal: `src/modules/health/health.module.ts`

Responsabilidad:

- Exponer liveness y readiness del servicio.
- Proteger endpoints de health con secret y rate limit.
- Verificar dependencias criticas antes de reportar readiness correcta.

Entradas principales:

- `GET /bot/health/live`
- `GET /bot/health/ready`

Dependencias:

- `GoogleSheetsModule` para readiness.
- `DatabaseModule` para readiness de PostgreSQL.
- `ReservationJobsModule` cuando la configuracion requiere validar Redis.

Archivos clave:

- `src/modules/health/controller/health.controller.ts`
- `src/modules/health/service/health.service.ts`
- `src/modules/health/guards/health-secret.guard.ts`
- `src/modules/health/guards/health-rate-limit.guard.ts`
