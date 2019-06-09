import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";

import * as e from './'

export type UsageEventKind = 'create' | 'call' | 'delete';
const USAGE_EVENT_KINDS: UsageEventKind[] = ['create', 'call', 'delete']

@Entity()
export class UsageEvent {
  constructor(kind: UsageEventKind, cost: number, billTo: e.PaymentToken, fun: e.Fun, description?: string) {
    this.kind = kind
    this.cost = cost
    this.ts = new Date()
    this.fun = fun
    this.billedTo = billTo
    this.description = description
  }

  @PrimaryGeneratedColumn()
  id!: number

  @Column({ enum: USAGE_EVENT_KINDS })
  kind: UsageEventKind

  @Column({ type: 'timestamptz' })
  ts: Date

  /** in hundreths of pennies */
  @Column({ type: 'bigint' })
  cost: number

  @ManyToOne(type => e.PaymentToken, token => token.usageEvents)
  billedTo: e.PaymentToken

  @ManyToOne(type => e.Fun, fun => fun.usageEvents)
  fun: e.Fun

  @Column({ type: 'text', nullable: true })
  description?: string
}
