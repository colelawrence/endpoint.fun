import "reflect-metadata";
import {createConnection} from "typeorm";

import { createApp } from './express-app'

createConnection().then((conn) => {
  createApp(conn).listen(3000)
})

import * as TJS from 'typescript-json-schema'

import {resolve} from 'path'

const basePath = resolve(__dirname, '../test/')
const tsconfig = resolve(__dirname, '../test/tsconfig.json')
const files = [resolve(__dirname, '../test/main.ts')]

// const options: TJS.CompilerOptions = ;
const settings: TJS.PartialArgs = {
  rejectDateType: true,
  excludePrivate: true,
  required: true,
  titles: true,
}
const program = TJS.programFromConfig(tsconfig)
const gen = TJS.buildGenerator(program, settings);
if (gen == null) {
  console.log('gen was null')
} else {
  console.log(gen.getUserSymbols().map(sym => sym))
  console.log(program.getDeclarationDiagnostics())
  console.log(program.getSourceFiles())
  const mainFile = program.getSourceFile(files[0]);
  if (mainFile != null) {
    console.log(mainFile)
  } else {
    console.log('could not find main file')
  }
  console.log('any last words?')
  // TJS.generateSchema(program, "MyType", settings, files)
}
