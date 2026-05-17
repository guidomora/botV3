# WhatsApp Availability Workflow

## Objetivo

Responder consultas de disponibilidad desde WhatsApp por dia, horario puntual o preferencia aproximada, respetando capacidad, cierres y reglas de agenda.

## Entrada

- Canal: WhatsApp via Twilio.
- Endpoint: `POST /bot/communication/queue`.
- Mensaje del usuario: consulta natural sobre disponibilidad.

## Participantes

- `WhatsAppController`
- Guards y middleware del webhook de WhatsApp.
- `WhatsAppService`
- `ReservationsService`
- `AiService`
- `IntentionsRouter`
- `AvailabilityStrategy`
- `DatesService`
- `GoogleSheetsAvailabilityService`
- `GoogleSheetsClosedScheduleService`

## Flujo feliz

1. El webhook pasa validaciones de seguridad, idempotencia y rate limit.
2. Se agrupan mensajes en rafaga del usuario.
3. `ReservationsService` procesa el mensaje.
4. `AiService` identifica una consulta de disponibilidad.
5. `AvailabilityStrategy` determina si la consulta es por dia, hora o franja.
6. Se consulta agenda, disponibilidad y cierres.
7. Si hay disponibilidad exacta, se responde con ese resultado.
8. Si no hay disponibilidad exacta, se buscan alternativas cercanas cuando aplica.
9. Se responde al usuario sin crear ni modificar reservas.

## Datos leidos

- Mensaje del usuario.
- Agenda cargada.
- Reservas confirmadas.
- Disponibilidad por franja.
- Cierres de dia y franja.
- Variables de capacidad, buffer, duracion e intervalo.

## Datos escritos

- Contexto conversacional si la consulta forma parte de un flujo activo.
- Respuesta saliente por Twilio.

## Validaciones

- La fecha consultada debe ser interpretable.
- No debe ofrecer disponibilidad en fechas u horarios pasados.
- No debe ofrecer dias cerrados.
- No debe ofrecer franjas cerradas.
- Las sugerencias deben respetar capacidad online.
- Una consulta de disponibilidad no debe confirmar reserva por si sola.

## Errores y contingencias

- Si falta fecha u horario necesario, se pide aclaracion.
- Si la fecha no existe en agenda, se informa o se piden datos validos.
- Si no hay disponibilidad exacta, se sugieren alternativas cuando sea posible.
- Si falla Google Sheets, no se informa disponibilidad como definitiva.
- Si OpenAI no interpreta la consulta, se responde de forma orientativa.

## Archivos clave

- `src/modules/reservations/service/intention/availability-reservation.strategy.ts`
- `src/modules/ai/prompts/availability-prompt.ts`
- `src/modules/ai/prompts/search-availability.prompt.ts`
- `src/modules/ai/prompts/ask-date-availability-prompt.ts`
- `src/modules/ai/prompts/time-availability-prompt.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.ts`
- `src/modules/google-sheets/service/google-sheets-closed-schedule.service.ts`
- `src/modules/dates/utils/pick-time-availability.utils.ts`
- `src/modules/dates/utils/formated-availability.utils.ts`

## Tests relacionados

- `src/modules/reservations/service/intention/availability-reservation.strategy.spec.ts`
- `src/modules/google-sheets/service/google-sheets-availability.service.spec.ts`
- `src/modules/google-sheets/service/google-sheets-closed-schedule.service.spec.ts`
- `src/modules/dates/utils/pick-time-availability.utils.spec.ts`
- `src/modules/dates/utils/formated-availability.utils.spec.ts`
