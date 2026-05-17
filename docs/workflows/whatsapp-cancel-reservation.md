# WhatsApp Cancel Reservation Workflow

## Objetivo

Cancelar una reserva existente desde WhatsApp, recolectando datos suficientes para localizarla sin cancelar reservas ambiguas.

## Entrada

- Canal: WhatsApp via Twilio.
- Endpoint: `POST /bot/communication/queue`.
- Mensaje del usuario: texto natural solicitando cancelar una reserva.

## Participantes

- `WhatsAppController`
- Guards y middleware del webhook de WhatsApp.
- `WhatsAppService`
- `ReservationsService`
- `AiService`
- `IntentionsRouter`
- `DeleteReservationStrategy`
- `DatesService`
- `DeleteReservationUseCase`
- `GoogleSheetsModule`
- `CacheContextModule`

## Flujo feliz

1. El webhook pasa validaciones de seguridad, idempotencia y rate limit.
2. Se agrupan mensajes en rafaga del usuario.
3. `ReservationsService` recupera contexto conversacional.
4. `AiService` clasifica o mantiene la intencion de cancelacion.
5. `DeleteReservationStrategy` extrae datos para ubicar la reserva.
6. Si faltan datos, el bot pide solo lo necesario.
7. Se busca la reserva confirmada.
8. Si existe y no hay ambiguedad, se elimina o limpia la fila correspondiente.
9. Se recalcula disponibilidad.
10. Se limpia estado conversacional relacionado.
11. Se confirma la cancelacion al usuario.

## Datos leidos

- Contexto conversacional.
- Telefono del usuario.
- Fecha y hora indicadas.
- Reservas confirmadas.
- Disponibilidad asociada al dia.

## Datos escritos

- Estado de cancelacion en cache mientras faltan datos.
- Hoja de reservas al eliminar o limpiar la reserva.
- Disponibilidad recalculada.
- Respuesta saliente por Twilio.

## Validaciones

- Deben existir datos suficientes para localizar la reserva.
- No debe cancelarse una reserva ambigua.
- La reserva debe existir.
- La disponibilidad debe actualizarse luego de la baja.
- Un webhook duplicado no debe ejecutar dos cancelaciones inconsistentes.

## Errores y contingencias

- Si faltan datos, se piden.
- Si no se encuentra la reserva, se informa sin modificar datos.
- Si los datos no coinciden con ninguna reserva, no se cancela.
- Si falla Google Sheets, no se informa cancelacion exitosa.
- Si el usuario cambia claramente de intencion, el flujo puede reencaminarse.

## Archivos clave

- `src/modules/reservations/service/intention/delete-reservation.strategy.ts`
- `src/modules/dates/application/delete-reservation.use-case.ts`
- `src/modules/ai/prompts/cancel-prompt.ts`
- `src/modules/ai/prompts/cancel-reservation-result.prompt.ts`
- `src/modules/google-sheets/service/google-sheets-reservations.service.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.ts`
- `src/modules/cache-context/cache.service.ts`

## Tests relacionados

- `src/modules/reservations/service/intention/delete-reservation.strategy.spec.ts`
- `src/modules/dates/application/delete-reservation.use-case.spec.ts`
- `src/modules/google-sheets/service/google-sheets-reservations.service.spec.ts`
