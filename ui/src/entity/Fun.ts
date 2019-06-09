import { Entity, Column, OneToMany, ManyToOne, PrimaryColumn } from "typeorm";

import * as e from './'

export type FunEncodedTriple = Readonly<{
  encodingVersion: string,
  encodedBody: Buffer,
  encodedSchema: Buffer,
}>

@Entity()
export class Fun {
  private constructor(id: string, by: e.PaymentToken, encodingVersion: string, encodedBody: Buffer, encodedSchema: Buffer) {
    this.id = id
    this.body = encodedBody
    this.schema = encodedSchema
    this.version = encodingVersion
    this.createdAt = new Date()
    this.createdBy = by
  }

  // I think this has to be separated because it has a signature deconstructor and how typeorm creates objects
  static create(id: string, by: e.PaymentToken, { encodingVersion, encodedBody, encodedSchema }: FunEncodedTriple): Fun {
    return new Fun(id, by, encodingVersion, encodedBody, encodedSchema)
  }

  @PrimaryColumn({ type: 'text', unique: true })
  id: string

  /** defines the encoding version for decoding the body and schema buffers */
  @Column({ type: 'text' })
  version: string

  /** encoded body */
  @Column({ type: 'bytea' })
  body: Buffer

  /** encoded schema */
  @Column({ type: 'bytea' })
  schema: Buffer

  @Column({ type: 'timestamptz' })
  createdAt: Date

  @Column({ type: 'timestamptz', nullable: true })
  deactivatedAt?: Date

  @ManyToOne(type => e.PaymentToken, pmtToken => pmtToken.functions)
  createdBy: e.PaymentToken

  @OneToMany(type => e.UsageEvent, usageEvent => usageEvent.fun)
  usageEvents!: e.UsageEvent[]
}
