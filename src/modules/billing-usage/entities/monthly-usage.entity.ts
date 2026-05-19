import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from './account.entity';

@Entity({ name: 'monthly_usage' })
@Index('IDX_monthly_usage_account_period_unique', ['accountId', 'period'], { unique: true })
export class MonthlyUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  accountId: string;

  @Column({ type: 'varchar', length: 7 })
  period: string;

  @Column({ type: 'integer', default: 0 })
  whatsappReservationsUsed: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Account, (account) => account.monthlyUsages, { nullable: false })
  @JoinColumn({ name: 'accountId' })
  account?: Account;
}
