# WhatsApp Billing Usage Limits Spec

## Objetivo

Agregar persistencia SQL para planes, suscripciones y consumo mensual, usando PostgreSQL + TypeORM, y limitar en el MVP la cantidad de reservas confirmadas creadas desde WhatsApp.

## Alcance

- La unidad de consumo sigue siendo la reserva creada por el flujo conversacional de WhatsApp.
- Cuando el cupo mensual esta agotado o no puede validarse, se bloquea temprano todo mensaje entrante de WhatsApp para evitar consumo conversacional adicional.
- Las reservas creadas desde endpoints internos o dashboard no consumen cupo en esta etapa.
- El sistema trabaja con un unico cliente/restaurante en el MVP.
- El modelo debe incluir un identificador de cuenta/restaurante para evitar redisenar las tablas cuando se agregue multi-cliente.
- Google Sheets sigue siendo la fuente operativa para reservas, disponibilidad y agenda.
- PostgreSQL se usa como fuente de verdad para planes, suscripciones, eventos de uso y agregados mensuales.

## No Alcance

- No se implementa login, registro ni seleccion dinamica de cliente.
- No se implementan pagos, facturacion, Stripe, invoices ni prorrateos.
- No se migran reservas ni disponibilidad desde Google Sheets a PostgreSQL.
- No se limita el dashboard interno/manual.
- No se limita la modificacion o cancelacion de reservas existentes.

## Decisiones Funcionales

- La unidad comercial principal es la reserva confirmada por WhatsApp.
- Una reserva completa desde WhatsApp reserva cupo de forma atomica antes de encolar la creacion.
- Si la creacion falla de forma confirmada despues de reservar cupo, el sistema debe liberar ese cupo.
- Si la cola ya recibio el job y luego falla la espera del resultado, el sistema conserva el cupo para evitar subcontabilizar una reserva que todavia podria completarse.
- Si faltan datos y la reserva queda temporal, no consume cupo.
- Si falla la escritura en Google Sheets, no debe quedar cupo consumido.
- Si Twilio reintenta o el flujo se reprocesa, el consumo debe registrarse de forma idempotente.
- El periodo de consumo es mensual calendario.
- El limite inicial es hard limit: al agotarse el cupo, no se crean nuevas reservas automaticas desde WhatsApp.
- Al agotarse el cupo, el bot debe responder al primer mensaje entrante con un mensaje claro y derivar a contacto directo/manual, sin llamar OpenAI ni procesar intenciones.

## Modelo de Datos

### Account

Representa el cliente/restaurante. En el MVP existira un unico registro.

Campos conceptuales:

- `id`
- `name`
- `createdAt`
- `updatedAt`

### Plan

Representa un plan comercial disponible.

Campos conceptuales:

- `id`
- `code`
- `name`
- `monthlyWhatsappReservationLimit`
- `isActive`
- `createdAt`
- `updatedAt`

### Subscription

Relaciona una cuenta con un plan activo.

Campos conceptuales:

- `id`
- `accountId`
- `planId`
- `status`: `active`, `paused`, `cancelled`
- `currentPeriodStart`
- `currentPeriodEnd`
- `createdAt`
- `updatedAt`

### UsageEvent

Ledger/auditoria de consumos. Es la fuente para reconstruir consumo ante inconsistencias.

Campos conceptuales:

- `id`
- `accountId`
- `eventType`: inicialmente `whatsapp_reservation_created`
- `idempotencyKey`
- `quantity`
- `period`
- `metadata`
- `occurredAt`
- `createdAt`

Reglas:

- `idempotencyKey` debe ser unico por evento de negocio. En el flujo WhatsApp MVP se deriva de `MessageSid`.
- Un reintento con la misma clave no debe incrementar el consumo dos veces.

### MonthlyUsage

Agregado mensual para consultas rapidas y validacion de limites.

Campos conceptuales:

- `id`
- `accountId`
- `period`
- `whatsappReservationsUsed`
- `createdAt`
- `updatedAt`

Reglas:

- Debe existir una unica fila por `accountId + period`.
- El incremento debe ocurrir dentro de una operacion transaccional junto con la creacion del `UsageEvent`.

## Flujo de Validacion

Para cualquier mensaje entrante de WhatsApp:

1. Los guards validan firma e idempotencia.
2. Antes de rate limit y antes de ejecutar el controller, `WhatsAppUsageLimitGuard` consulta si la cuenta default puede crear reservas WhatsApp.
3. Si no hay cupo, no hay suscripcion activa, el plan esta inactivo o PostgreSQL no permite validar el cupo, responde por Twilio con derivacion manual y corta el request con `200 { ok: true }`.
4. Si hay cupo disponible, el mensaje continua al flujo conversacional actual.

Para una creacion desde WhatsApp con cupo disponible:

1. El flujo conversacional recolecta datos y valida reglas existentes.
2. Antes de confirmar una nueva reserva, consume cupo WhatsApp de forma atomica para la cuenta y periodo actual.
3. Si el cupo se agoto entre el pre-check y la confirmacion, responde al usuario y no escribe una nueva reserva en Google Sheets.
4. Si hay cupo, continua con el flujo actual de disponibilidad y creacion.
5. Si Google Sheets confirma la reserva, el cupo reservado queda como consumo definitivo.
6. Si la cola no llega a encolar o la creacion responde con error despues de reservar cupo, el sistema intenta liberar el cupo.
7. Si la cola ya encolo el job y falla la espera del resultado, conserva el cupo y devuelve una respuesta de fallo al usuario porque el resultado operativo queda desconocido.
8. Si liberar el cupo falla, el sistema debe loguear el problema con suficiente contexto para reparacion manual o futura cola de compensacion.

## Integracion Tecnica

- Agregar TypeORM como modulo global/configurado desde `AppModule`.
- Agregar un `DatabaseModule` global que encapsule `TypeOrmModule.forRootAsync`.
- Agregar variables de entorno para conexion PostgreSQL.
- Agregar `docker-compose.yml` principal con Redis y PostgreSQL para desarrollo local.
- Mantener `docker-compose.redis.yml` temporalmente por compatibilidad.
- La migracion inicial crea `account` default, plan `mvp_default` y suscripcion activa para que una DB nueva no bloquee el MVP.
- Agregar modulo de billing/usage con servicios testeables e independientes del flujo de reservas.
- Integrar `WhatsAppUsageLimitGuard` en `WhatsAppController` para bloquear temprano mensajes entrantes cuando no hay cupo o no se puede validar.
- Integrar el chequeo de cupo en `CreateReservationStrategy`, dentro de la rama `COMPLETED`, antes de encolar la creacion de reserva.
- Consumir el cupo desde el mismo camino WhatsApp antes de encolar la creacion, usando una operacion transaccional e idempotente.
- Liberar el cupo reservado cuando la cola responde con error o lanza una excepcion antes de encolar la reserva. No liberar automaticamente cuando el job ya fue encolado y falla la espera del resultado.
- No integrar el limite en `CreateReservationQueueService`, `DatesService` ni `CreateReservationRowUseCase` para no afectar el dashboard/manual, que comparten esas capas.
- Reutilizar patrones de NestJS existentes: modulos por feature, servicios inyectables, tests con `TestingModule`.

## Decision de Disponibilidad de DB

PostgreSQL es dependencia critica para el flujo WhatsApp cuando esta feature esta activa. Si la DB no esta disponible, el sistema no debe procesar mensajes WhatsApp porque no puede validar ni registrar cupo de forma confiable.

## Errores y Contingencias

- Sin suscripcion activa: bloquear nuevas reservas WhatsApp y responder con derivacion manual.
- Plan pausado/cancelado: bloquear nuevas reservas WhatsApp.
- Cupo agotado: bloquear nuevas reservas WhatsApp.
- PostgreSQL no disponible: tratar como dependencia critica para mensajes WhatsApp con limites; no procesar el mensaje si no se puede validar cupo.
- Error al liberar cupo tras una creacion fallida: registrar error con datos de trazabilidad.

## Testing Esperado

- Tests unitarios para calculo de periodo mensual calendario.
- Tests unitarios para validacion de cupo disponible/agatado.
- Tests unitarios para idempotencia de eventos de uso.
- Tests de integracion de servicio con repositorios mockeados.
- Tests del flujo de creacion WhatsApp que cubran:
  - cupo disponible permite continuar;
  - cupo agotado no crea reserva;
  - reserva incompleta no consume cupo;
  - reserva confirmada consume cupo una sola vez.
- Tests del guard de entrada WhatsApp que cubran:
  - cupo disponible permite continuar;
  - cupo agotado responde por Twilio y corta antes del controller;
  - error al validar cupo corta temprano para evitar consumo adicional.

## Documentacion

Actualizar:

- `README.md` con variables PostgreSQL y comando `docker compose up -d`.
- `docs/architecture/data-and-state.md` para incorporar PostgreSQL como fuente de estado de plataforma.
- `docs/architecture/module-map.md` para documentar el nuevo modulo de billing/usage.
- `docs/workflows/whatsapp-create-reservation.md` para documentar el chequeo de cupo.
