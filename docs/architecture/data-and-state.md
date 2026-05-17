# Data And State

Este documento resume donde vive la informacion del sistema y que reglas de consistencia deben respetarse.

## Fuentes de estado

El sistema combina estado persistente, estado temporal y estado de ejecucion:

- Google Sheets: fuente operativa para reservas, disponibilidad, agenda y datos temporales.
- Cache conversacional: historial y estado de flujos por usuario.
- Redis/jobs: colas y estado operacional para trabajos asincronicos.
- Variables de entorno: configuracion de integraciones, seguridad, limites y reglas operativas.

## Google Sheets

Google Sheets es el almacenamiento operativo principal.

Vistas principales:

- Hoja de reservas confirmadas.
- Hoja de disponibilidad por fecha/franja.
- Hoja temporal para datos parciales de conversaciones.
- Datos de cierres de dias o franjas cuando aplica.

Responsabilidades:

- Persistir reservas confirmadas.
- Calcular y exponer disponibilidad.
- Mantener datos temporales mientras una reserva esta incompleta.
- Reflejar altas, bajas y modificaciones del calendario operativo.

Servicios principales:

- `src/modules/google-sheets/service/google-sheets.service.ts`
- `src/modules/google-sheets/service/google-sheets-reservations.service.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.ts`
- `src/modules/google-sheets/service/google-temporal-sheet.service.ts`
- `src/modules/google-sheets/service/google-sheets-closed-schedule.service.ts`

## Reservas confirmadas

Una reserva confirmada representa una operacion completada y persistida en la hoja principal.

Reglas generales:

- No debe crearse si faltan datos obligatorios.
- No debe duplicarse para el mismo telefono y dia.
- No debe violar capacidad disponible.
- No debe moverse o crearse en fecha u horario pasado.
- Toda creacion, modificacion o baja debe mantener consistente la disponibilidad.

Codigo relacionado:

- `src/modules/dates/application/create-reservation.use-case.ts`
- `src/modules/dates/application/update-reservation.use-case.ts`
- `src/modules/dates/application/delete-reservation.use-case.ts`
- `src/modules/google-sheets/service/google-sheets-reservations.service.ts`

## Disponibilidad

La disponibilidad depende de capacidad efectiva y reservas que se solapan en una franja.

Datos de configuracion relevantes:

- `MAX_CAPACITY_TOTAL`
- `ONLINE_BUFFER_PERCENT`
- `RESERVATION_DURATION_MINUTES`
- `MAX_PEOPLE_PER_RESERVATION`

Regla conceptual:

- La capacidad online se calcula aplicando el buffer sobre la capacidad total.
- Una reserva solo se confirma si la ocupacion solapada mas la cantidad solicitada no supera esa capacidad online.
- Las reservas grandes pueden derivarse a atencion directa en lugar de automatizarse.

Codigo relacionado:

- `src/lib/helpers/capacity.utils.ts`
- `src/lib/helpers/large-reservation.helper.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.ts`

## Hoja temporal

La hoja temporal sostiene datos parciales cuando una conversacion todavia no contiene todo lo necesario para confirmar una reserva.

Uso esperado:

- Guardar datos recolectados durante una creacion incompleta.
- Completar datos faltantes a medida que el usuario responde.
- Migrar a reserva confirmada cuando todos los datos estan completos y validados.
- Eliminar o limpiar el dato temporal al terminar el flujo o al expirar la conversacion.

Codigo relacionado:

- `src/modules/google-sheets/service/google-temporal-sheet.service.ts`
- `src/modules/dates/adapters/google-sheets-temporal.adapter.ts`
- `src/modules/cache-context/conversation-expiration-notifier.service.ts`

## Cache conversacional

El cache conversacional guarda estado por usuario para que el bot pueda continuar una conversacion multi-turno.

Responsabilidades:

- Mantener historial reciente.
- Recordar intencion activa.
- Guardar datos parciales del flujo.
- Expirar conversaciones incompletas.
- Limpiar datos temporales asociados cuando corresponde.

TTL documentados en `README.md`:

- Flujo en progreso: 3h.
- Flujo completado: 2h.
- Limite duro total: 6h.

Codigo relacionado:

- `src/modules/cache-context/cache.service.ts`
- `src/modules/cache-context/cache-monitor.service.ts`
- `src/modules/cache-context/conversation-expiration-notifier.service.ts`
- `src/lib/types/cache/*`

## Idempotencia y rate limit

El webhook de WhatsApp tiene protecciones de entrada que tambien dependen de estado temporal.

Idempotencia:

- Deduplica reintentos de Twilio por `AccountSid + MessageSid`.
- Evita doble procesamiento de un mismo mensaje.
- Usa TTL configurable.

Rate limit:

- Controla frecuencia por usuario de WhatsApp.
- Tiene ventanas cortas, largas, bloqueo y cooldown de notificacion.

Codigo relacionado:

- `src/modules/whatsapp/service/idempotency.service.ts`
- `src/modules/whatsapp/service/rate-limit.service.ts`
- `src/modules/whatsapp/guards/whatsapp-idempotency.guard.ts`
- `src/modules/whatsapp/guards/whatsapp-rate-limit.guard.ts`

## Redis y jobs

`ReservationJobsModule` centraliza trabajos asincronicos y la conexion Redis usada por esas colas.

Usos principales:

- Encolar creaciones de reserva.
- Encolar modificaciones de reserva.
- Encolar eliminaciones de reserva.
- Procesar notificaciones asociadas a cierres de agenda.
- Registrar fallos de notificaciones para consulta posterior.

Codigo relacionado:

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

## Variables de entorno

Las variables de entorno definen comportamiento operacional y de integraciones.

Categorias principales:

- Twilio: credenciales, firma y envio de mensajes.
- OpenAI: proveedor de IA y modelo/configuracion asociada.
- Google Sheets: credenciales e identificadores de hojas.
- Seguridad interna: tokens, secrets y firmas HMAC.
- Rate limit e idempotencia.
- Capacidad y reglas de reservas.
- Redis/jobs.
- Health checks.

Codigo relacionado:

- `src/config/env.validation.ts`
- `src/lib/types/config/env-config.type.ts`

## Reglas de consistencia

Cada cambio que afecte reservas debe preservar estas relaciones:

- Una reserva confirmada debe tener disponibilidad recalculada.
- Una reserva temporal completada no debe quedar duplicada como temporal.
- Una baja o modificacion debe reflejarse en disponibilidad.
- Un cierre de dia o franja debe bloquear nuevas reservas hacia ese rango.
- Un flujo expirado debe limpiar estado conversacional y datos temporales asociados cuando aplique.
- Un webhook duplicado no debe producir dos operaciones de negocio.

Antes de cambiar codigo que toque estado, revisar:

1. Que fuente de estado se lee.
2. Que fuente de estado se escribe.
3. Que proceso recalcula o sincroniza datos derivados.
4. Que pasa si la operacion falla a mitad de camino.
5. Que proteccion evita duplicados o reintentos inconsistentes.
