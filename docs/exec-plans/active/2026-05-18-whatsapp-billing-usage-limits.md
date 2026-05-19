# WhatsApp Billing Usage Limits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir planes/consumo en PostgreSQL y bloquear nuevas reservas creadas desde WhatsApp cuando se agote el cupo mensual.

**Architecture:** PostgreSQL se integra mediante un `DatabaseModule` global con TypeORM. El nuevo `BillingUsageModule` contiene entidades y servicios de cupo/ledger. La integracion del limite vive en `CreateReservationStrategy` para afectar solo el flujo WhatsApp y no el dashboard/manual.

**Tech Stack:** NestJS 11, TypeScript, TypeORM, PostgreSQL, Jest, Docker Compose.

---

## Source Spec

- `docs/specs/2026-05-18-whatsapp-billing-usage-limits.md`

## Task 1: Dependencias, Docker Compose y Configuracion DB

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `docker-compose.yml`
- Modify: `.env.template`
- Modify: `src/config/env.validation.ts`
- Modify: `src/config/env.validation.spec.ts`
- Modify: `src/lib/types/config/env-config.type.ts`
- Create: `src/modules/database/database.module.ts`
- Create: `src/modules/database/service/database-health.service.ts`
- Create: `src/modules/database/service/database-health.service.spec.ts`
- Create: `src/database/data-source.ts`
- Modify: `src/app.module.ts`

- [x] **Step 1: Install TypeORM dependencies**

Run:

```bash
npm install @nestjs/typeorm typeorm pg
npm install -D typeorm-ts-node-commonjs
```

Expected: dependencies are added to `package.json` and `package-lock.json`.

- [x] **Step 2: Create Docker Compose with Redis and Postgres**

Create `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:7.2-alpine
    container_name: botv3-redis
    ports:
      - '6379:6379'
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis-data:/data

  postgres:
    image: postgres:16-alpine
    container_name: botv3-postgres
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: botv3
      POSTGRES_USER: botv3
      POSTGRES_PASSWORD: botv3
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  redis-data:
  postgres-data:
```

- [x] **Step 3: Add DB envs to `.env.template`**

Add:

```dotenv
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=botv3
DATABASE_PASSWORD=botv3
DATABASE_NAME=botv3
DATABASE_SSL=false
```

- [x] **Step 4: Write failing env validation tests**

In `src/config/env.validation.spec.ts`, add tests that prove:

- DB defaults are accepted when not provided.
- `DATABASE_PORT` must be a positive integer.
- `DATABASE_SSL` parses boolean flags.

Run:

```bash
npm test -- src/config/env.validation.spec.ts
```

Expected before implementation: FAIL because DB fields are not present in `EnvConfig`.

- [x] **Step 5: Implement env validation and config type**

Add to `EnvConfig`:

```ts
DATABASE_HOST: string;
DATABASE_PORT: number;
DATABASE_USER: string;
DATABASE_PASSWORD: string;
DATABASE_NAME: string;
DATABASE_SSL: boolean;
```

Add to Joi schema:

```ts
DATABASE_HOST: Joi.string().trim().default('localhost'),
DATABASE_PORT: positiveInteger.default(5432),
DATABASE_USER: Joi.string().trim().default('botv3'),
DATABASE_PASSWORD: Joi.string().trim().default('botv3'),
DATABASE_NAME: Joi.string().trim().default('botv3'),
DATABASE_SSL: booleanFlag.default(false),
```

- [x] **Step 6: Add DatabaseModule and health service**

Create `DatabaseModule` with `TypeOrmModule.forRootAsync`, `autoLoadEntities: true`, `synchronize: false`, and config read from `ConfigService<EnvConfig>`.

Create `DatabaseHealthService` with:

```ts
async isHealthy(): Promise<boolean>
```

It should call `DataSource.query('SELECT 1')` and return `true`; on error it returns `false`.

- [x] **Step 7: Add TypeORM CLI DataSource**

Create `src/database/data-source.ts` exporting a `DataSource` configured from `process.env`, with entities under `src/**/*.entity.ts` and migrations under `src/database/migrations/*.{ts,js}`.

Add scripts:

```json
"migration:generate": "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:generate src/database/migrations/Migration",
"migration:run": "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:run",
"migration:revert": "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:revert"
```

- [x] **Step 8: Register DatabaseModule**

Import `DatabaseModule` in `src/app.module.ts` after `ConfigModule.forRoot(...)`.

- [x] **Step 9: Verify task**

Run:

```bash
npm test -- src/config/env.validation.spec.ts src/modules/database/service/database-health.service.spec.ts
npm run build
```

Expected: tests and build pass.

## Task 2: Billing Usage Entities, Migration and Core Service

**Files:**

- Create: `src/modules/billing-usage/billing-usage.module.ts`
- Create: `src/modules/billing-usage/entities/account.entity.ts`
- Create: `src/modules/billing-usage/entities/plan.entity.ts`
- Create: `src/modules/billing-usage/entities/subscription.entity.ts`
- Create: `src/modules/billing-usage/entities/usage-event.entity.ts`
- Create: `src/modules/billing-usage/entities/monthly-usage.entity.ts`
- Create: `src/modules/billing-usage/entities/index.ts`
- Create: `src/modules/billing-usage/service/billing-period.service.ts`
- Create: `src/modules/billing-usage/service/billing-period.service.spec.ts`
- Create: `src/modules/billing-usage/service/usage-limit.service.ts`
- Create: `src/modules/billing-usage/service/usage-limit.service.spec.ts`
- Create: `src/modules/billing-usage/test/mocks/dependency-mocks.ts`
- Create: `src/lib/types/billing-usage/billing-usage.type.ts`
- Modify: `src/lib/types/index.ts`
- Create: `src/database/migrations/<timestamp>-CreateBillingUsageTables.ts`
- Modify: `src/app.module.ts`

- [x] **Step 1: Write failing BillingPeriodService tests**

Test:

- `getCurrentPeriod(new Date('2026-05-18T12:00:00.000Z'))` returns `2026-05`.
- `getPeriodBounds('2026-05')` returns start `2026-05-01T00:00:00.000Z` and end `2026-06-01T00:00:00.000Z`.

Run:

```bash
npm test -- src/modules/billing-usage/service/billing-period.service.spec.ts
```

Expected: FAIL because service does not exist.

- [x] **Step 2: Implement BillingPeriodService**

Implement deterministic UTC month calendar helpers:

```ts
getCurrentPeriod(now = new Date()): string
getPeriodBounds(period: string): { start: Date; end: Date }
```

- [x] **Step 3: Write failing UsageLimitService tests**

Cover:

- active subscription with usage below limit returns allowed;
- active subscription at limit returns blocked;
- missing active subscription returns blocked;
- registering a new `whatsapp_reservation_created` event creates event and increments monthly usage;
- registering same `idempotencyKey` twice does not increment twice.

Use mocked TypeORM repositories/DataSource, not a real DB.

- [x] **Step 4: Create entities**

Create TypeORM entities for `Account`, `Plan`, `Subscription`, `UsageEvent`, `MonthlyUsage`.

Required unique indexes:

- `Plan.code`
- `UsageEvent.idempotencyKey`
- `MonthlyUsage.accountId + period`

Use explicit enum columns for:

- `SubscriptionStatus`: `active`, `paused`, `cancelled`
- `UsageEventType`: `whatsapp_reservation_created`

- [x] **Step 5: Implement UsageLimitService**

Expose:

```ts
canCreateWhatsappReservation(accountId: string): Promise<{ allowed: boolean; reason?: string }>
consumeWhatsappReservationQuota(params: {
  accountId: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}): Promise<ConsumeWhatsappReservationQuotaResult>
releaseWhatsappReservationQuota(params: {
  accountId: string;
  idempotencyKey: string;
}): Promise<ReleaseWhatsappReservationQuotaResult>
```

`consumeWhatsappReservationQuota` must run in a TypeORM transaction, insert the `UsageEvent` idempotently, and increment `MonthlyUsage` only if the active plan has available quota. `releaseWhatsappReservationQuota` compensates failed reservation attempts by deleting the event and decrementing the monthly aggregate.

- [x] **Step 6: Add migration**

Create a migration that creates all billing usage tables and indexes.

- [x] **Step 7: Register BillingUsageModule**

Import `TypeOrmModule.forFeature([...])` in `BillingUsageModule`, provide services, export `UsageLimitService`, and import `BillingUsageModule` in `AppModule`.

- [x] **Step 8: Verify task**

Run:

```bash
npm test -- src/modules/billing-usage
npm run build
```

Expected: tests and build pass.

## Task 3: Integrate Limit With WhatsApp Create Reservation Strategy

**Files:**

- Modify: `src/modules/reservations/reservations.module.ts`
- Modify: `src/modules/reservations/service/intention/create-reservation.strategy.ts`
- Modify: `src/modules/reservations/service/intention/create-reservation.strategy.spec.ts`
- Modify: `src/modules/reservations/test/mocks/dependency-mocks.ts`

- [x] **Step 1: Write failing strategy tests**

Add tests proving:

- when temporal status is `COMPLETED` and quota is blocked, strategy returns a quota message and does not call `createReservationQueueService.createReservation`;
- when quota is allowed and queue succeeds, strategy consumes WhatsApp reservation quota once;
- when reservation is `IN_PROGRESS`, strategy does not check quota;
- when queue fails or throws after quota consumption, strategy releases the reserved quota.

Run:

```bash
npm test -- src/modules/reservations/service/intention/create-reservation.strategy.spec.ts
```

Expected: FAIL because `UsageLimitService` is not injected.

- [x] **Step 2: Add UsageLimitService mock**

Add `createUsageLimitServiceMock()` to `src/modules/reservations/test/mocks/dependency-mocks.ts`.

Mock methods:

```ts
consumeWhatsappReservationQuota: jest.fn();
releaseWhatsappReservationQuota: jest.fn();
```

- [x] **Step 3: Inject UsageLimitService**

Add `BillingUsageModule` to `ReservationsModule.imports`.

Add `UsageLimitService` to `CreateReservationStrategy` constructor.

- [x] **Step 4: Check quota before queue**

In `TemporalStatusEnum.COMPLETED`, before `createReservationQueueService.createReservation(...)`, call:

```ts
const usageCheck = await this.usageLimitService.consumeWhatsappReservationQuota({
  accountId: DEFAULT_ACCOUNT_ID,
  idempotencyKey,
  metadata,
});
```

If blocked, append the reply to cache and return without enqueueing.

For MVP, use a single-account constant:

```ts
export const DEFAULT_ACCOUNT_ID = 'default';
```

Place the constant in `src/modules/billing-usage/constants/billing-usage.constants.ts`.

- [x] **Step 5: Release quota on queue failures**

If the queue returns an error or throws after a new quota consumption, call:

```ts
await this.usageLimitService.releaseWhatsappReservationQuota({
  accountId: DEFAULT_ACCOUNT_ID,
  idempotencyKey,
});
```

If this call fails, log structured repair context and continue returning the existing graceful reservation failure reply.

- [x] **Step 6: Verify task**

Run:

```bash
npm test -- src/modules/reservations/service/intention/create-reservation.strategy.spec.ts
npm run test:reservations
```

Expected: tests pass.

## Task 4: Health Readiness and Documentation

**Files:**

- Modify: `src/modules/health/service/health.service.ts`
- Modify: `src/modules/health/service/health.service.spec.ts`
- Modify: `src/lib/types/health/health-check-readiness.type.ts`
- Modify: `src/modules/health/dto/health-check-ready-response.dto.ts`
- Modify: `README.md`
- Modify: `docs/architecture/data-and-state.md`
- Modify: `docs/architecture/module-map.md`
- Modify: `docs/workflows/whatsapp-create-reservation.md`

- [x] **Step 1: Write failing health tests**

Add readiness tests:

- Postgres healthy appears in readiness details.
- Postgres unhealthy marks readiness unavailable.

Run:

```bash
npm test -- src/modules/health/service/health.service.spec.ts
```

Expected: FAIL because health does not include DB.

- [x] **Step 2: Inject DatabaseHealthService into HealthService**

Add DB readiness check using the existing custom health style. Do not add `@nestjs/terminus`.

- [x] **Step 3: Update readiness type and DTO**

Add a `database`/`postgres` field to readiness details.

- [x] **Step 4: Update README**

Document:

- `docker compose up -d` as the recommended local dependency command;
- PostgreSQL env vars;
- TypeORM migration scripts;
- that `docker-compose.redis.yml` remains available temporarily for Redis-only local usage.

- [x] **Step 5: Update architecture/workflow docs**

Document:

- PostgreSQL as platform/billing state;
- `DatabaseModule` and `BillingUsageModule`;
- WhatsApp create reservation quota check before enqueue;
- usage registration after successful WhatsApp reservation creation.

- [x] **Step 6: Verify task**

Run:

```bash
npm test -- src/modules/health/service/health.service.spec.ts
npm run build
```

Expected: tests and build pass.

## Task 5: Full Verification and Cleanup

**Files:**

- Modify plan checklist as tasks are completed.

- [x] **Step 1: Run formatter/linter**

Run:

```bash
npm run fix
```

Expected: command exits 0.

- [x] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [x] **Step 3: Build**

Run:

```bash
npm run build
```

Expected: build exits 0.

- [x] **Step 4: Validate compose config**

Run:

```bash
docker compose config
```

Expected: compose file is valid.

- [x] **Step 5: Review git diff**

Run:

```bash
git diff --stat
git diff -- docs/specs/2026-05-18-whatsapp-billing-usage-limits.md docs/exec-plans/active/2026-05-18-whatsapp-billing-usage-limits.md
```

Expected: changes match spec and plan, with no unrelated edits.

## Task 6: Early WhatsApp Usage Limit Guard

**Files:**

- Modify: `src/modules/billing-usage/constants/billing-usage.constants.ts`
- Create: `src/modules/whatsapp/guards/whatsapp-usage-limit.guard.ts`
- Create: `src/modules/whatsapp/guards/whatsapp-usage-limit.guard.spec.ts`
- Modify: `src/modules/whatsapp/controller/whatsapp.controller.ts`
- Modify: `src/modules/whatsapp/controller/whatsapp.controller.spec.ts`
- Modify: `src/modules/whatsapp/whatsapp.module.ts`
- Modify: `src/modules/whatsapp/test/mocks/dependency-mocks.ts`
- Modify: `src/modules/reservations/service/intention/create-reservation.strategy.ts`
- Modify: `docs/specs/2026-05-18-whatsapp-billing-usage-limits.md`
- Modify: `docs/workflows/whatsapp-create-reservation.md`
- Modify: `docs/architecture/data-and-state.md`
- Modify: `docs/architecture/module-map.md`

- [x] **Step 1: Write failing guard tests**

Add tests proving:

- missing `WaId` allows the request;
- available quota allows the request;
- exhausted quota sends the manual-derivation reply and short-circuits with HTTP 200;
- quota validation errors also send the manual-derivation reply and short-circuit to avoid conversational cost.

- [x] **Step 2: Implement `WhatsAppUsageLimitGuard`**

Use `UsageLimitService.canCreateWhatsappReservation(DEFAULT_ACCOUNT_ID)` before the controller runs. When blocked or validation fails, send `WHATSAPP_QUOTA_BLOCKED_REPLY` through Twilio and throw `HttpException({ ok: true }, HttpStatus.OK)`.

- [x] **Step 3: Wire guard into WhatsApp controller and module**

Add guard order:

```ts
TwilioSignatureGuard,
WhatsAppIdempotencyGuard,
WhatsAppUsageLimitGuard,
WhatsAppRateLimitGuard,
```

- [x] **Step 4: Share blocked reply constant**

Move the blocked quota reply to `billing-usage.constants.ts` and reuse it from both `WhatsAppUsageLimitGuard` and `CreateReservationStrategy`.

- [x] **Step 5: Update spec and docs**

Document that exhausted/unavailable quota blocks all incoming WhatsApp messages early, before OpenAI/orchestration.

- [x] **Step 6: Verify task**

Run:

```bash
npm run fix
npm test
npm run build
docker compose config
```

Expected: all commands exit 0.
