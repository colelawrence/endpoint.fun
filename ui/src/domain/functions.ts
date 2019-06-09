import { Connection, Repository } from 'typeorm'

import * as e from '../entity'
import * as d from './'
import { FunDefinition, createFun, FunSignatures } from '../typer';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { Definition } from 'typescript-json-schema';

export type JSONSchema = any;

export type FunBody = string

export type Fun = Readonly<{
  id: string,
  /** lazy load typescript body */
  body: () => FunBody,
  /** lazy load schema */
  schema: () => FunSignatures,
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

  async callFunction(funId: string, name: string, args: any[]): Promise<any> {
    const fun = await this.findActiveFunction(funId)
    const schema = fun.schema()
    const storageId = schema.storageId
    const fnSchema = schema.defs.find(fnSchema => fnSchema.name == name)

    if (fnSchema == null)
      return Promise.reject(`Function with name "${name}" does not exist on endpoint "${funId}"`)

    const uriArgs = args.map((val, idx) => {
      const type = (<Definition[]>fnSchema.parameters.items)[idx].type
      switch (type) {
        case 'array':
        case 'object':
          return val
        default:
          return JSON.stringify(val)
      }
    }).map(encodeURIComponent)

    return new Promise((res, rej) => {
      const cp = spawn('deno', ['run', `"./v0/${storageId}/call_${name}.ts"`, ...uriArgs], { shell: true, cwd: resolve(__dirname, '../../store') })

      let stdout = ''
      let stderr = ''
      cp.stdout.on('data', out => stdout += out)
      cp.stderr.on('data', err => stderr += err)

      cp.on('close', console.log.bind(console, 'close'))
      cp.on('disconnect', console.log.bind(console, 'disconnect'))
      cp.on('message', console.log.bind(console, 'message'))
      cp.on('exit', (...args) => {
        console.log('exit', { stdout, stderr }, ...args)
        res(JSON.parse(decodeURIComponent(stdout.replace(/^.*>>&>>><<<&<</, ''))))
      })
    })
  }
}

const ENC_EX0 = "ex0";

const CODERS_BY_VERSION = {
  [ENC_EX0]: {
    bufferToSchema(buf: Buffer): FunSignatures {
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
