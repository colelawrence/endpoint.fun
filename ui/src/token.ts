
import { Connection as C, Repository } from 'typeorm'
import * as e from './entity'

export type JSONSchema = any;

export type FunSchema = {
  fns: {
    [id: string]: {
      args: JSONSchema[],
      returns: JSONSchema,
    }
  }
}

export type Fun = Readonly<{
  id: string,
  /** lazy load typescript body */
  body: () => string,
  /** lazy load schema */
  schema: () => FunSchema,
  createdAt: Date,
}>

export type Token = Readonly<{
  key: string,
  updatedAt: Date,
  revokedAt?: Date,
}>

export type UsageEventKind = e.UsageEventKind;
export type UsageEvent = Readonly<{
  id: number,
  ts: Date,
  kind: UsageEventKind,
  /** in hundreths of pennies */
  cost: number,
  desc?: string,
}>


const tokenFromEntity = (pt: e.PaymentToken) => <Token>{
  key: pt.key,
  createdAt: pt.createdAt,
  updatedAt: pt.updatedAt,
  revokedAt: pt.revokedAt,
}

const usageEventFromEntity = (evt: e.UsageEvent) => <UsageEvent>{
  id: evt.id,
  desc: evt.description,
  kind: evt.kind,
  cost: evt.cost,
  ts: evt.ts,
}

/** @todo need to implement decompression and formatting */
const bodyFromFunEntityBuffer = (buf: Buffer) =>
  "function hello() { return 'TODO: implement body from entity buffer'; }"


/** @todo need to implement decompression and formatting */
const schemaFromFunEntityBuffer = (buf: Buffer) => <FunSchema>{
  fns: {
    hello: {
      args: [],
      returns: {
        type: "string"
      },
    }
  }
}

const funFromEntity = (fun: e.Fun) => <Fun>{
  id: fun.id,
  body: () => {
    console.error('TODO: implement body from entity buffer');
    return bodyFromFunEntityBuffer(fun.body)
  },
  schema: () => {
    console.error('TODO: implement schema from entity buffer');
    return schemaFromFunEntityBuffer(fun.schema)
  },
  createdAt: fun.createdAt,
}

export class TokenRepo {
  private repo: Repository<e.PaymentToken>;

  constructor(private conn: C) {
    this.repo = conn.getRepository(e.PaymentToken)
  }

  /**
   * Fails if {@link e.PaymentToken} does not exist
   * Fails if {@link e.PaymentToken} has been revoked
   * Fails if tokenKey is non string or empty string
   * @param tokenKey key of token to find
   */
  async findActiveToken(tokenKey: string): Promise<Token> {
    const token = await this.findToken(tokenKey);

    if (token.revokedAt != null) {
      return Promise.reject("Payment token is no longer active")
    }

    return token
  }

  generateToken(): Promise<Token> {
    // TODO: avoid collisions with retry loop
    return this.repo.save(new e.PaymentToken(generateString(64, 24))).then(tokenFromEntity)
  }

  /**
   * Fails if {@link e.PaymentToken} does not exist
   * Fails if tokenKey is non string or empty string
   * @param tokenKey key of token to revoke
   */
  async revokeToken(tokenKey: string): Promise<Token> {
    const pmtToken = await this._findTokenEntity(tokenKey);

    if (pmtToken.revokedAt != null) {
      return Promise.reject("Token has already been revoked")
    }

    pmtToken.revokedAt = new Date()
    return this.repo.save(pmtToken).then(tokenFromEntity)
  }

  findToken(tokenKey: string): Promise<Token> {
    return this._findTokenEntity(tokenKey).then(tokenFromEntity)
  }

  findTokenAndEvents(tokenKey: string): Promise<[Token, UsageEvent[]]> {
    return this._findTokenEntity(tokenKey, { loadUsageEvents: true }).then((pmtToken) => [tokenFromEntity(pmtToken), pmtToken.usageEvents.map(usageEventFromEntity)])
  }

  private async _findTokenEntity(tokenKey: string, options?: { loadUsageEvents?: true }): Promise<e.PaymentToken> {
    if (!isNonEmptyString(tokenKey)) {
      return Promise.reject("Must supply key string")
    }

    const relations: (keyof e.PaymentToken)[] = []

    if (options && options.loadUsageEvents) {
      relations.push('usageEvents')
    }

    const pmtToken = await this.repo.findOne({ where: { key: tokenKey }, relations });

    if (pmtToken == null) {
      return Promise.reject("Token does not exist")
    }

    return pmtToken
  }
}

const isNonEmptyString = (obj: any): obj is String => (typeof obj === 'string' && obj.length > 0);
const generateString = (len: number, radix: number) => {
  let result = ""
  while (result.length < len) {
    result += Math.random().toString(radix).slice(2)
  }
  return result.slice(0, len)
}
