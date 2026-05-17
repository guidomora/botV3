# Agenda Maintenance Workflow

## Objetivo

Mantener la agenda operativa disponible hacia el futuro y limpiar informacion historica fuera de la ventana de retencion.

## Entrada

Operaciones automaticas:

- `POST /bot/dates/ensure-agenda-window`
- `DELETE /bot/dates/delete-old-rows`

Operaciones manuales:

- `POST /bot/dates`
- `POST /bot/dates/next-date`
- `POST /bot/dates/x-dates`

Proteccion:

- `x-agenda-sync-timestamp`
- `x-agenda-sync-signature`

## Participantes

- `DatesController`
- `AgendaSyncGuard`
- `DatesManualGuard`
- `AgendaSyncSecurityService`
- `AgendaSyncReplayService`
- `AgendaSyncRateLimitService`
- `DatesService`
- `CreateDayUseCase`
- `EnsureAgendaWindowUseCase`
- `DeleteReservationUseCase`
- `GoogleSheetsModule`

## Asegurar ventana futura

Flujo feliz:

1. El workflow externo o cliente operativo invoca `/bot/dates/ensure-agenda-window`.
2. `AgendaSyncGuard` valida secret, timestamp, firma HMAC, replay y rate limit.
3. `DatesService` delega en `EnsureAgendaWindowUseCase`.
4. Se consulta la agenda actual en Google Sheets.
5. Se calcula cobertura futura.
6. Si la cobertura ya alcanza `AGENDA_DAYS_AHEAD`, no se crean dias.
7. Si faltan dias, se crean solo los faltantes.
8. Se responde con el resultado de sincronizacion.

Datos leidos:

- Agenda actual.
- `AGENDA_DAYS_AHEAD`.
- Headers de firma.

Datos escritos:

- Nuevos dias de agenda cuando faltan.

## Crear dias manualmente

Flujo feliz:

1. Un operador autorizado invoca un endpoint manual.
2. `DatesManualGuard` valida la misma seguridad de agenda sync.
3. Se aplica rate limit con scope por path.
4. `DatesService` ejecuta la creacion solicitada.
5. Se agregan dias a la agenda.
6. Se responde con resultado textual.

Casos:

- Crear el proximo dia.
- Crear el siguiente dia faltante.
- Crear multiples dias segun cantidad recibida.

## Limpiar historial viejo

Flujo feliz:

1. El workflow externo invoca `/bot/dates/delete-old-rows`.
2. `AgendaSyncGuard` valida seguridad.
3. `DatesService` delega limpieza.
4. Se calcula fecha de corte usando `AGENDA_DAYS_BACK_TO_KEEP`.
5. Se eliminan filas anteriores a la ventana historica.
6. Si no hay filas viejas, no se elimina nada.
7. Se dejan logs de trazabilidad.
8. Se responde con resultado o sin cambios.

Datos leidos:

- Reservas historicas.
- Disponibilidad historica.
- Datos temporales expirados.
- Cierres historicos.
- `AGENDA_DAYS_BACK_TO_KEEP`.

Datos escritos:

- Eliminacion de filas antiguas.
- Limpieza de temporales expirados.
- Limpieza de cierres antiguos cuando aplique.

## Validaciones

- `AGENDA_SYNC_SECRET` debe estar configurado.
- Timestamp dentro de ventana permitida.
- Firma HMAC valida.
- Firma no reutilizada.
- Rate limit no excedido.
- Cantidad de dias manuales valida.
- Retencion historica debe ser mayor a cero.
- No duplicar dias existentes.
- No borrar datos dentro de la ventana vigente.

## Errores y contingencias

- Falta de headers: request rechazado.
- Timestamp vencido: request rechazado.
- Firma invalida: request rechazado.
- Replay detectado: request rechazado.
- Rate limit excedido: request rechazado.
- Si no hay filas viejas, se registra sin borrar nada.
- Si Google Sheets falla, no se debe informar mantenimiento exitoso.

## Archivos clave

- `src/modules/dates/controller/dates.controller.ts`
- `src/modules/dates/guards/agenda-sync.guard.ts`
- `src/modules/dates/guards/dates-manual.guard.ts`
- `src/modules/dates/service/dates.service.ts`
- `src/modules/dates/service/agenda-sync-security.service.ts`
- `src/modules/dates/service/agenda-sync-replay.service.ts`
- `src/modules/dates/service/agenda-sync-rate-limit.service.ts`
- `src/modules/dates/application/create-day.use-case.ts`
- `src/modules/dates/application/ensure-agenda-window.use-case.ts`
- `src/modules/dates/application/delete-reservation.use-case.ts`

## Tests relacionados

- `src/modules/dates/controller/dates.controller.spec.ts`
- `src/modules/dates/guards/agenda-sync.guard.spec.ts`
- `src/modules/dates/service/agenda-sync-security.service.spec.ts`
- `src/modules/dates/service/agenda-sync-replay.service.spec.ts`
- `src/modules/dates/service/agenda-sync-rate-limit.service.spec.ts`
- `src/modules/dates/application/create-day.use-case.spec.ts`
- `src/modules/dates/application/ensure-agenda-window.use-case.spec.ts`
- `src/modules/dates/application/delete-reservation.use-case.spec.ts`
