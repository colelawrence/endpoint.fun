import { Repository, Connection } from 'typeorm';

import * as e from '../entity'

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


export class TokenBL {
  private constructor(
    private tokens: Repository<e.PaymentToken>,
  ) { }

  static fromConnection(conn: Connection): TokenBL {
    return new TokenBL(
      conn.getRepository(e.PaymentToken),
    )
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

  async generateToken(): Promise<Token> {
    const newTokenE = new e.PaymentToken(e.utils.generateTokenKey())
    // retry loop in case of a collision
    let retries = 5
    while (true) {
      try {
        await this.tokens.insert(newTokenE)
        return tokenFromEntity(newTokenE)

      } catch (err) {
        newTokenE.key = e.utils.generateTokenKey()
        retries--
        if (retries == 0) {
          return Promise.reject(err)
        }
      }
    }
  }

  /**
   * Fails if {@link e.PaymentToken} does not exist
   * Fails if tokenKey is non string or empty string
   * @param tokenKey key of token to revoke
   */
  async revokeToken(tokenKey: string): Promise<Token> {
    const pmtToken = await e.utils.findTokenEntity(this.tokens, tokenKey);

    if (pmtToken.revokedAt != null) {
      return Promise.reject("Token has already been revoked")
    }

    pmtToken.revokedAt = new Date()
    return this.tokens.save(pmtToken).then(tokenFromEntity)
  }

  async findToken(tokenKey: string): Promise<Token> {
    const pt = await e.utils.findTokenEntity(this.tokens, tokenKey);
    return tokenFromEntity(pt);
  }

  async findTokenAndEvents(tokenKey: string): Promise<[Token, UsageEvent[]]> {
    const pmtToken = await e.utils.findTokenEntity(this.tokens, tokenKey, { loadUsageEvents: true });
    return [tokenFromEntity(pmtToken), pmtToken.usageEvents.map(usageEventFromEntity)];
  }
}
