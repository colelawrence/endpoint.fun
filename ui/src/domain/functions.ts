import { Connection, Repository } from 'typeorm'

import * as e from '../entity'
import * as d from './'
import { FunDefinition, createFun } from '../typer';

export type JSONSchema = any;

export type FunSchema = {
  storageId: string,
  fns: FunDefinition[],
}

export type FunBody = string

export type Fun = Readonly<{
  id: string,
  /** lazy load typescript body */
  body: () => FunBody,
  /** lazy load schema */
  schema: () => FunSchema,
  createdAt: Date,
}>

export class FunctionBL {
  private constructor(
    private funs: Repository<e.Fun>,
    private tokens: Repository<e.PaymentToken>,
    private usage: Repository<e.UsageEvent>,
  ) { }

  static fromConnection(conn: Connection): FunctionBL {
    return new FunctionBL(
      conn.getRepository(e.Fun),
      conn.getRepository(e.PaymentToken),
      conn.getRepository(e.UsageEvent)
    )
  }

  /**
   * Fails if {@link e.Fun} does not exist
   * Fails if {@link e.Fun} has been revoked
   * Fails if funId is non string or empty string
   * @param funId is id of function to find
   */
  async findActiveFunction(funId: string): Promise<Fun> {
    const fun = await e.utils.findFunEntity(this.funs, funId);

    if (fun.deactivatedAt != null) {
      return Promise.reject("Function is no longer active")
    }

    return funFromEntity(fun)
  }

  /**
   * Fails if {@link e.Fun} does not exist
   * Fails if funId is non string or empty string
   * @param funId is id of function to find
   */
  async findFunction(funId: string): Promise<Fun> {
    const fun = await e.utils.findFunEntity(this.funs, funId);
    return funFromEntity(fun);
  }

  /**
   * @param by creator of function
   * @param body of the typescript file
   */
  async createFunction(by: d.Token, body: string): Promise<Fun> {
    const ownerTokenE = await e.utils.findTokenEntity(this.tokens, by.key);
    const encodedFunTriple = await CODERS_BY_VERSION[ENC_EX0].encodeBody(body);

    const newFunE = e.Fun.create(
      e.utils.generateFunId(),
      ownerTokenE,
      encodedFunTriple,
    )

    // retry loop in case of a collision
    let retries = 5
    while (true) {
      try {
        await this.funs.insert(newFunE)
        break
      } catch (err) {
        newFunE.id = e.utils.generateFunId()
        retries--
        if (retries == 0) {
          return Promise.reject(err)
        }
      }
    }

    const usageEventE = new e.UsageEvent('create', d.money.hundrethsOfPennies(100), ownerTokenE, newFunE, `created function {fn#${newFunE.id}}`)

    return this.usage.save(usageEventE).then(_ => {
      return funFromEntity(newFunE)
    }).catch(err => {
      // undo creating function if usage event fails
      return this.funs.remove(newFunE).then(_ => Promise.reject(err))
    })
  }

  /**
   * Fails if {@link e.Fun} does not exist
   * Fails if id is non string or empty string
   * @param funId id of function to deactivate
   */
  async deactivateFunction(funId: string): Promise<Fun> {
    const funE = await e.utils.findFunEntity(this.funs, funId);

    if (funE.deactivatedAt != null) {
      return Promise.reject("Function has already been deactivated")
    }

    funE.deactivatedAt = new Date()
    return this.funs.save(funE).then(funFromEntity)
  }
}

const ENC_EX0 = "ex0";

const CODERS_BY_VERSION = {
  [ENC_EX0]: {
    bufferToSchema(buf: Buffer): FunSchema {
      return JSON.parse(buf.toString("utf-8"))
    },
    bufferToBody(buf: Buffer): FunBody {
      return buf.toString("utf-8")
    },
    /** @todo need to actually check the TypeScript and attempt to generate schema from it */
    encodeBody(body: FunBody): Promise<e.FunEncodedTriple> {
      const funSchema = createFun(body);

      return Promise.resolve({
        encodingVersion: ENC_EX0,
        encodedBody: new Buffer(body, "utf-8"),
        encodedSchema: new Buffer(JSON.stringify(funSchema), "utf-8")
      })
    }
  }
}

type BodyCoders = typeof CODERS_BY_VERSION[typeof ENC_EX0];

const funFromEntity = (fun: e.Fun) => <Fun>{
  id: fun.id,
  body: () => {
    const coders: BodyCoders | undefined = (<any>CODERS_BY_VERSION)[fun.version];
    if (coders == null) {
      throw new Error(`Unrecognized function encoding version: ${fun.version}!`)
    }
    return coders.bufferToBody(fun.body)
  },
  schema: () => {
    const coders: BodyCoders | undefined = (<any>CODERS_BY_VERSION)[fun.version];
    if (coders == null) {
      throw new Error(`Unrecognized function encoding version: ${fun.version}!`)
    }
    return coders.bufferToSchema(fun.schema)
  },
  createdAt: fun.createdAt,
}
