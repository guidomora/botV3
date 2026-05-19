import { UsageEventType } from 'src/lib';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Account } from './account.entity';

@Entity({ name: 'usage_events' })
export class UsageEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  accountId: string;

  @Column({
    type: 'enum',
    enum: UsageEventType,
  })
  eventType: UsageEventType;

  @Index('IDX_usage_events_idempotency_key_unique', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  idempotencyKey: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 7 })
  period: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Account, (account) => account.usageEvents, { nullable: false })
  @JoinColumn({ name: 'accountId' })
  account?: Account;
}
