import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";

import * as e from './'

@Entity()
export class PaymentToken {
  constructor(key: string) {
    this.key = key
    this.updatedAt = new Date()
    this.createdAt = new Date()
  }

  @PrimaryGeneratedColumn()
  id!: string

  @Column({ type: 'text', unique: true, nullable: false })
  key: string

  @Column({ type: 'timestamptz', nullable: false })
  createdAt: Date

  @Column({ type: 'timestamptz', nullable: false })
  updatedAt: Date

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date

  @OneToMany(type => e.Fun, fun => fun.createdBy)
  functions!: e.Fun[]

  @OneToMany(type => e.UsageEvent, usageEvent => usageEvent.billedTo)
  usageEvents!: e.UsageEvent[]
}
