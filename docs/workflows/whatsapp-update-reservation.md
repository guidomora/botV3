# WhatsApp Update Reservation Workflow

## Objetivo

Modificar una reserva existente desde WhatsApp, localizando primero la reserva original y aplicando cambios solo si son validos.

## Entrada

- Canal: WhatsApp via Twilio.
- Endpoint: `POST /bot/communication/queue`.
- Mensaje del usuario: texto natural solicitando cambiar fecha, hora, nombre o cantidad.

## Participantes

- `WhatsAppController`
- Guards y middleware del webhook de WhatsApp.
- `WhatsAppService`
- `ReservationsService`
- `AiService`
- `IntentionsRouter`
- `UpdateReservationStrategy`
- `DatesService`
- `UpdateReservationUseCase`
- `GoogleSheetsModule`
- `CacheContextModule`

## Flujo feliz

1. El webhook pasa validaciones de seguridad, idempotencia y rate limit.
2. Se agrupan mensajes en rafaga del usuario.
3. `ReservationsService` recupera contexto conversacional.
4. `AiService` clasifica o mantiene la intencion de modificacion.
5. `UpdateReservationStrategy` intenta identificar la reserva original.
6. Si faltan datos para localizarla, el bot los solicita.
7. Una vez localizada, la estrategia extrae los cambios pedidos.
8. Se validan fecha, hora, cantidad y disponibilidad nueva.
9. `UpdateReservationUseCase` actualiza la reserva.
10. Se recalcula disponibilidad.
11. Se actualiza o limpia el estado conversacional.
12. Se responde al usuario con la confirmacion.

## Datos leidos

- Contexto conversacional activo.
- Datos de la reserva original.
- Reservas confirmadas.
- Disponibilidad del nuevo horario.
- Cierres de dia o franja.
- Variables de capacidad y limites de grupo.

## Datos escritos

- Estado conversacional mientras faltan datos.
- Reserva actualizada.
- Disponibilidad recalculada.
- Respuesta saliente por Twilio.

## Validaciones

- La reserva original debe existir.
- La reserva original no debe estar en el pasado.
- La nueva fecha y hora no deben estar en el pasado.
- La nueva cantidad debe respetar limite de grupo.
- La nueva fecha/hora debe existir en agenda.
- La nueva fecha/hora no debe estar cerrada.
- La modificacion no debe superar capacidad online.

## Errores y contingencias

- Si faltan datos para ubicar la reserva, se piden.
- Si la reserva original no existe, se informa que no pudo encontrarse.
- Si la reserva original ya paso, no se modifica.
- Si el nuevo horario no tiene disponibilidad, no se altera la reserva original.
- Si falla la persistencia, no se informa modificacion exitosa.

## Archivos clave

- `src/modules/reservations/service/intention/update-reservation.strategy.ts`
- `src/modules/dates/application/update-reservation.use-case.ts`
- `src/modules/ai/prompts/update-reservation.prompt.ts`
- `src/modules/ai/prompts/update-extraction.prompt.ts`
- `src/modules/google-sheets/service/google-sheets-reservations.service.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.ts`
- `src/modules/cache-context/cache.service.ts`

## Tests relacionados

- `src/modules/reservations/service/intention/update-reservation.strategy.spec.ts`
- `src/modules/dates/application/update-reservation.use-case.spec.ts`
- `src/modules/google-sheets/service/google-sheets-reservations.service.spec.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.spec.ts`
