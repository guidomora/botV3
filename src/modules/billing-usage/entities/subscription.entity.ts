import { SubscriptionStatus } from 'src/lib';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from './account.entity';
import { Plan } from './plan.entity';

@Entity({ name: 'subscriptions' })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  accountId: string;

  @Column({ type: 'uuid' })
  planId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
  })
  status: SubscriptionStatus;

  @Column({ type: 'timestamptz' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamptz' })
  currentPeriodEnd: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Account, (account) => account.subscriptions, { nullable: false })
  @JoinColumn({ name: 'accountId' })
  account?: Account;

  @ManyToOne(() => Plan, (plan) => plan.subscriptions, { eager: false, nullable: false })
  @JoinColumn({ name: 'planId' })
  plan?: Plan;
}
