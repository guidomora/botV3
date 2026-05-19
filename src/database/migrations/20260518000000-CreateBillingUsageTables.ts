import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateBillingUsageTables20260518000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.createTable(
      new Table({
        name: 'accounts',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'plans',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'monthlyWhatsappReservationLimit',
            type: 'integer',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );
    await queryRunner.createIndex(
      'plans',
      new TableIndex({
        name: 'IDX_plans_code_unique',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'subscriptions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'accountId',
            type: 'varchar',
          },
          {
            name: 'planId',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'paused', 'cancelled'],
          },
          {
            name: 'currentPeriodStart',
            type: 'timestamptz',
          },
          {
            name: 'currentPeriodEnd',
            type: 'timestamptz',
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );
    await queryRunner.createForeignKeys('subscriptions', [
      new TableForeignKey({
        columnNames: ['accountId'],
        referencedTableName: 'accounts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['planId'],
        referencedTableName: 'plans',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'usage_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'accountId',
            type: 'varchar',
          },
          {
            name: 'eventType',
            type: 'enum',
            enum: ['whatsapp_reservation_created'],
          },
          {
            name: 'idempotencyKey',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'quantity',
            type: 'integer',
            default: 1,
          },
          {
            name: 'period',
            type: 'varchar',
            length: '7',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'occurredAt',
            type: 'timestamptz',
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );
    await queryRunner.createIndex(
      'usage_events',
      new TableIndex({
        name: 'IDX_usage_events_idempotency_key_unique',
        columnNames: ['idempotencyKey'],
        isUnique: true,
      }),
    );
    await queryRunner.createForeignKey(
      'usage_events',
      new TableForeignKey({
        columnNames: ['accountId'],
        referencedTableName: 'accounts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'monthly_usage',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'accountId',
            type: 'varchar',
          },
          {
            name: 'period',
            type: 'varchar',
            length: '7',
          },
          {
            name: 'whatsappReservationsUsed',
            type: 'integer',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );
    await queryRunner.createIndex(
      'monthly_usage',
      new TableIndex({
        name: 'IDX_monthly_usage_account_period_unique',
        columnNames: ['accountId', 'period'],
        isUnique: true,
      }),
    );
    await queryRunner.createForeignKey(
      'monthly_usage',
      new TableForeignKey({
        columnNames: ['accountId'],
        referencedTableName: 'accounts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.query(`
      INSERT INTO "accounts" ("id", "name")
      VALUES ('default', 'Default restaurant')
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "plans" ("code", "name", "monthlyWhatsappReservationLimit", "isActive")
      VALUES ('mvp_default', 'MVP Default', 1000, true)
      ON CONFLICT ("code") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "subscriptions" ("accountId", "planId", "status", "currentPeriodStart", "currentPeriodEnd")
      SELECT 'default', "id", 'active', '2020-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z'
      FROM "plans"
      WHERE "code" = 'mvp_default'
        AND NOT EXISTS (
          SELECT 1
          FROM "subscriptions"
          WHERE "accountId" = 'default'
            AND "status" = 'active'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('monthly_usage', true, true, true);
    await queryRunner.dropTable('usage_events', true, true, true);
    await queryRunner.dropTable('subscriptions', true, true, true);
    await queryRunner.dropTable('plans', true, true, true);
    await queryRunner.dropTable('accounts', true, true, true);
  }
}
