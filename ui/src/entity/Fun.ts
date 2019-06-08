import { Entity, Column, OneToMany, ManyToOne, PrimaryColumn } from "typeorm";
import * as e from '.'


@Entity()
export class Fun {
  constructor(id: string, by: e.PaymentToken, body: Buffer, schema: Buffer) {
    this.id = id
    this.body = body
    this.schema = schema
    this.createdAt = new Date()
    this.createdBy = by
  }

  @PrimaryColumn({ type: 'text', unique: true })
  id: string

  @Column({ type: 'bytea' })
  body: Buffer

  @Column({ type: 'bytea' })
  schema: Buffer

  @Column({ type: 'timestamptz' })
  createdAt: Date

  @ManyToOne(type => e.PaymentToken, pmtToken => pmtToken.functions)
  createdBy: e.PaymentToken

  @OneToMany(type => e.UsageEvent, usageEvent => usageEvent.fun)
  usageEvents!: e.UsageEvent[]
}
