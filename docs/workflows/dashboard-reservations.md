# Dashboard Reservations Workflow

## Objetivo

Gestionar reservas y disponibilidad desde endpoints internos consumidos por un dashboard u otro cliente autorizado.

## Entrada

- Canal: API interna.
- Base: `/bot/reservations`.
- Proteccion: `x-internal-api-token`.

## Participantes

- `ReservationsController`
- `InternalApiTokenGuard`
- `ReservationsDashboardService`
- Use cases de `src/modules/reservations/application`
- `GoogleSheetsReservationsDashboardAdapter`
- `GoogleSheetsModule`
- `ReservationJobsModule` para jobs y notificaciones asociadas.

## Flujos soportados

- Crear reserva desde dashboard.
- Editar reserva existente.
- Eliminar reserva existente.
- Obtener fechas disponibles.
- Obtener slots diarios.
- Obtener resumen diario.
- Cerrar un dia.
- Reabrir un dia.
- Cerrar una franja horaria.
- Reabrir una franja horaria.
- Consultar fallos de notificacion de una operacion de cierre.

## Flujo feliz general

1. El cliente envia el header `x-internal-api-token`.
2. `InternalApiTokenGuard` valida el token contra `INTERNAL_API_TOKEN`.
3. `ReservationsController` valida params, query o body mediante DTOs.
4. `ReservationsDashboardService` delega al use case correspondiente.
5. El use case lee o escribe datos operativos.
6. Si la operacion afecta disponibilidad, se recalcula o sincroniza.
7. Si corresponde notificar reservas afectadas, se usan jobs.
8. El endpoint responde con DTO de exito.

## Datos leidos

- Token interno.
- Agenda disponible.
- Reservas confirmadas.
- Disponibilidad por fecha/franja.
- Cierres vigentes.
- Estado de operaciones de notificacion.

## Datos escritos

- Reservas confirmadas.
- Cierres de dia.
- Cierres de franja.
- Disponibilidad recalculada.
- Jobs de notificacion.
- Estado de fallos de notificacion.

## Validaciones

- `INTERNAL_API_TOKEN` debe estar configurado.
- El header debe coincidir con el token esperado.
- Fecha ISO de entrada debe ser valida.
- Body debe cumplir DTOs.
- No se debe crear o mover reservas a fechas fuera de agenda.
- No se debe cerrar una fecha inexistente.
- No se debe reabrir una franja de manera incompatible con un cierre de dia completo.
- No se debe actualizar una reserva sin campos editables.

## Errores y contingencias

- Token ausente o invalido: `ForbiddenException`.
- Fecha o body invalido: error de validacion.
- Reserva no encontrada: respuesta de no encontrado.
- Conflicto de negocio: respuesta de conflicto.
- Fallos de notificacion de cierres quedan consultables por operacion.

## Archivos clave

- `src/modules/reservations/controller/reservations.controller.ts`
- `src/modules/reservations/guards/internal-api-token.guard.ts`
- `src/modules/reservations/service/reservations-dashboard.service.ts`
- `src/modules/reservations/application/create-dashboard-reservation.use-case.ts`
- `src/modules/reservations/application/update-dashboard-reservation.use-case.ts`
- `src/modules/reservations/application/delete-dashboard-reservation.use-case.ts`
- `src/modules/reservations/application/close-dashboard-day.use-case.ts`
- `src/modules/reservations/application/close-dashboard-slot.use-case.ts`
- `src/modules/reservations/application/open-dashboard-day.use-case.ts`
- `src/modules/reservations/application/open-dashboard-slot.use-case.ts`
- `src/modules/reservations/application/get-closure-notification-failures.use-case.ts`

## Tests relacionados

- `src/modules/reservations/controller/reservations.controller.spec.ts`
- `src/modules/reservations/guards/internal-api-token.guard.spec.ts`
- `src/modules/reservations/service/reservations-dashboard.service.spec.ts`
- `src/modules/reservations/application/*dashboard*.spec.ts`
- `src/modules/reservations/application/*closed*.spec.ts`
- `src/modules/reservation-jobs/service/closure-notification-*.spec.ts`
