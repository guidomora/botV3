import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MonthlyUsage } from './monthly-usage.entity';
import { Subscription } from './subscription.entity';
import { UsageEvent } from './usage-event.entity';

@Entity({ name: 'accounts' })
export class Account {
  @PrimaryColumn('varchar')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Subscription, (subscription) => subscription.account)
  subscriptions?: Subscription[];

  @OneToMany(() => UsageEvent, (usageEvent) => usageEvent.account)
  usageEvents?: UsageEvent[];

  @OneToMany(() => MonthlyUsage, (monthlyUsage) => monthlyUsage.account)
  monthlyUsages?: MonthlyUsage[];
}
