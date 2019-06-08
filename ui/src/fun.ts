
import { Connection as C, Repository } from 'typeorm'
import * as e from './entity'

export class FunRepo {
  private repo: Repository<e.Fun>;

  constructor(private conn: C) {
    this.repo = conn.getRepository(e.Fun)
  }

  /**
   * Fails if {@link e.Fun} does not exist
   * Fails if {@link e.Fun} has been revoked
   * Fails if tokenKey is non string or empty string
   * @param tokenKey key of token to find
   */
  async findActiveFunction(funId: string): Promise<e.Fun> {
    const fun = await this.findFun(funId);

    if (fun.revokedAt != null) {
      return Promise.reject("Payment token is no longer active")
    }

    return fun
  }

  generateToken(): Promise<e.Fun> {
    // TODO: avoid collisions with retry loop
    return this.repo.save(new e.Fun(generateString(64, 24)))
  }

  /**
   * Fails if {@link e.Fun} does not exist
   * Fails if tokenKey is non string or empty string
   * @param tokenKey key of token to revoke
   */
  async revokeToken(tokenKey: string): Promise<e.Fun> {
    const pmtToken = await this.findFun(tokenKey);

    if (pmtToken.revokedAt != null) {
      return Promise.reject("Token has already been revoked")
    }

    pmtToken.revokedAt = new Date()
    return this.repo.save(pmtToken)
  }

  async findFun(tokenKey: string, options?: { loadUsageEvents?: true }): Promise<e.Fun> {
    if (!isNonEmptyString(tokenKey)) {
      return Promise.reject("Must supply key string to revoke a token")
    }

    const relations: (keyof e.Fun)[] = []

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

const isNonEmptyString = (obj: any): obj is String => (obj instanceof String && obj.length > 0);
const generateString = (len: number, radix: number) => {
  let result = ""
  while (result.length < len) {
    result += Math.random().toString(radix).slice(2)
  }
  return result.slice(0, len)
}
