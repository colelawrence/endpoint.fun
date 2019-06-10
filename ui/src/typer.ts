import * as ts from "typescript";
import * as TJS from 'typescript-json-schema'

import { resolve } from 'path'
import { readFileSync, writeFileSync, mkdirSync, rmdirSync, unlinkSync, readdirSync } from "fs";

export function test() {
  // const TEST_ID = 'Fa2345'
  const TEST_BODY = readFileSync('./store/example/Fa2345/source.ts', 'utf-8')
  populateAndGetSignaturesV0(TEST_BODY)
}

export function createFun(funBody: string): FunSignatures {
  return populateAndGetSignaturesV0(funBody)
}

export type FunSignatures = {
  storageId: string,
  defs: FunDefinition[]
}

const basePath = resolve(__dirname, '../store/')
const tsconfig = resolve(basePath, './tsconfig.json')

// where and how are we going to store our executable functions relative to helpers
const FUN_DIRS = {
  v0: {
    funDir: (funId: string) => resolve(basePath, 'v0', funId),
    sourceFilePath: (funId: string) => resolve(FUN_DIRS.v0.funDir(funId), `source.ts`),
    callFilePath: (funId: string, fn: Fn) => resolve(FUN_DIRS.v0.funDir(funId), `call_${fn.name}.ts`),
    typeFilePath: (funId: string, fn: Fn) => resolve(FUN_DIRS.v0.funDir(funId), `type_${fn.name}.ts`),
    stubParamTypesFile(funId: string, fn: Fn): { typeFilePath: string, fn: Fn, body: string } {
      const sigTypeName = fnNameToParamsSignature(fn.name)
      return {
        typeFilePath: FUN_DIRS.v0.typeFilePath(funId, fn),
        fn,
        body: `
import { ${fn.name} as f } from './source'
import * as h from '../../h'
export type ${sigTypeName.params} = h.Params<typeof f>
export type ${sigTypeName.return} = h.Return<typeof f>
`
      }
    },
    stubDenoCallFile(funId: string, fn: Fn): { callFilePath: string, fn: Fn, body: string } {
      return {
        callFilePath: FUN_DIRS.v0.callFilePath(funId, fn),
        fn,
        body: `import { ${fn.name} as f } from './source.ts'
import { a } from '../../h.ts'
a(f)
`
      }
    }
  }
}

type FunDirKey = keyof (typeof FUN_DIRS);
const CURRENT_KEY = 'v0';
const CURRENT_DIR = FUN_DIRS[CURRENT_KEY];


const fnNameToParamsSignature = (name: string) => ({ return: `${name}__sig__returns`, params: `${name}__sig__params` })

function populateAndGetSignaturesV0(body: string): FunSignatures {
  let retries = 5
  let id: string;
  let funDir: string;
  while (true) {
    id = 'V0' + Math.random().toString(36).slice(2);
    funDir = CURRENT_DIR.funDir(id);
    try {
      mkdirSync(funDir)
      break
    } catch {
      if (retries-- < 1) throw Error('Unable to find available storage id for funs')
    }
  }

  const sourceFilePath = CURRENT_DIR.sourceFilePath(id);
  writeFileSync(sourceFilePath, body, 'utf-8')

  const fns = getFns(sourceFilePath)

  const typeFilePaths = fns.map(fn => CURRENT_DIR.stubParamTypesFile(id, fn)).map(file => {
    writeFileSync(file.typeFilePath, file.body, 'utf-8')
    return file.typeFilePath
  })

  const program = TJS.programFromConfig(tsconfig, [...typeFilePaths, resolve(basePath, 'deno.d.ts')])
  const gen = TJS.buildGenerator(program, settings);

  if (!gen) throw new Error('generator failed to be created for call files')

  const completeFnDefinitions = fns.map(fn => {
    const sigCallTypeName = fnNameToParamsSignature(fn.name)
    const paramsSchema = gen.getSchemaForSymbol(sigCallTypeName.params)
    const returnsSchema = gen.getSchemaForSymbol(sigCallTypeName.return)

    // Create call file
    const callFile = CURRENT_DIR.stubDenoCallFile(id, fn)
    const callPath = callFile.callFilePath
    writeFileSync(callPath, callFile.body, 'utf-8')

    return combineFnSchemaWithDocs(fn, paramsSchema, returnsSchema, CURRENT_KEY)
  })

  return {
    storageId: id,
    defs: completeFnDefinitions,
  }
}

export type FunDefinition = {
  name: string,
  description?: string,
  dirKey: FunDirKey,
  parameters: TJS.Definition,
  returns: TJS.Definition,
}

function combineFnSchemaWithDocs(fn: Fn, params: TJS.Definition, returns: TJS.Definition, funDirKey: FunDirKey): FunDefinition {
  (<any>params.additionalItems) = false // not sure why TJS does not take this definition
  fn.args.forEach((arg, idx) => {
    // tsk tsk updating in place...
    const def: TJS.Definition = (<TJS.Definition[]>params.items)[idx]
    def.title = arg.name;
    if (arg.description)
      def.description = arg.description;
    if (arg.default) {
      try {
        def.default = JSON.parse(arg.default);
      } catch (err) {
        console.error('failed to parse default parameter:', arg.default, err)
      }
    }
  })

  return {
    name: fn.name,
    description: fn.description || undefined,
    dirKey: funDirKey,
    parameters: params,
    returns: returns,
  }
}

type Fn = Readonly<{
  name: string,
  description?: string,
  args: {
    name: string,
    description: string,
    pos: number,
    optional: boolean,
    default?: string,
  }[]
}>

const settings: TJS.PartialArgs = {
  rejectDateType: true,
  excludePrivate: true,
  required: true,
  titles: true,
}

function getFns(file: string): Fn[] {
  const program = TJS.programFromConfig(tsconfig, [file, resolve(basePath, 'deno.d.ts')])

  const gen = TJS.buildGenerator(program, settings);

  if (gen == null) {
    throw new Error('couldn\'t build generator')
  } else {
    const mainFile = program.getSourceFile(file);
    if (mainFile != null) {
      const exports: ts.Symbol[] = Array.from((<any>mainFile).symbol.exports.values())
      const checker = program.getTypeChecker();

      return exports
        .filter(symbol => symbol.flags & ts.SymbolFlags.Function)
        .map(sym => fnSymToFn(checker, sym))

    } else {
      throw new Error('could not find main file')
    }
  }
}

function fnSymToFn(checker: ts.TypeChecker, symbol: ts.Symbol): Fn {
  const params = (<(ts.Node & { [s: string]: any })[]>(<any>symbol.valueDeclaration).parameters || []);
  ts.SyntaxKind.StringKeyword
  return (<Fn>{
    name: symbol.getName(),
    description: symbol.getDocumentationComment(checker).map(a => a.text).join(''),
    args: params.map((paramNode, idx) => {
      const symbol = paramNode.symbol;
      const init = symbol.valueDeclaration.initializer;
      const name = paramNode.name.text;
      const description = symbol.getDocumentationComment(checker).map((a: any) => a.text).join('');
      if (init != null) {
        return {
          name,
          description,
          pos: idx,
          optional: true,
          default: init.text,
        }
      } else if (symbol.valueDeclaration.questionToken != null) {
        return {
          name,
          description,
          pos: idx,
          optional: true,
          default: undefined,
        }
      } else {
        return {
          name,
          description,
          pos: idx,
          optional: false,
          default: undefined,
        }
      }
    })
  })

}
