import { Repository } from 'typeorm';

import * as e from './'

export async function findTokenEntity(repo: Repository<e.PaymentToken>, tokenKey: string, options?: { loadUsageEvents?: true, loadFuns?: true }): Promise<e.PaymentToken> {
  if (!isNonEmptyString(tokenKey)) {
    return Promise.reject("Must supply token key string")
  }

  const relations: (keyof e.PaymentToken)[] = []

  if (options) {
    if (options.loadUsageEvents)
      relations.push('usageEvents')
    if (options.loadFuns)
      relations.push('functions')
  }

  const tokenE = await repo.findOne({ where: { key: tokenKey }, relations });

  if (tokenE == null) {
    return Promise.reject("Token does not exist")
  }

  return tokenE
}

/**
 *
 * @param funs
 * @param funId
 * @param options
 */
export async function findFunEntity(funs: Repository<e.Fun>, funId: string, options?: { loadUsageEvents?: true }): Promise<e.Fun> {
  if (!isNonEmptyString(funId)) {
    return Promise.reject("Must supply function id string")
  }

  const relations: (keyof e.Fun)[] = []

  if (options && options.loadUsageEvents) {
    relations.push('usageEvents')
  }

  const funE = await funs.findOne({ where: { id: funId }, relations });

  if (funE == null) {
    return Promise.reject("Function does not exist")
  }

  return funE
}

export function generateFunId(): string {
  return 'F' + generateString(15, 35)
}

export function generateTokenKey(): string {
  return 'T' + generateString(19, 28)
}

const isNonEmptyString = (obj: any): obj is String => (typeof obj === 'string' && obj.length > 0);

export const generateString = (len: number, radix: number) => {
  let result = ""
  while (result.length < len) {
    result += Math.random().toString(radix).slice(2)
  }
  return result.slice(0, len)
}
