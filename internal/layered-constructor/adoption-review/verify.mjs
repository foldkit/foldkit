import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const repository = resolve(directory, '../../..')
const ui = join(repository, 'packages/ui')
const core = join(repository, 'packages/foldkit')
const compiler = join(core, 'node_modules/typescript/bin/tsc')
if (!existsSync(join(directory, 'node_modules'))) {
  symlinkSync(join(ui, 'node_modules'), join(directory, 'node_modules'), 'dir')
}
const verification = join(directory, 'verification')
mkdirSync(verification, { recursive: true })
const run = mkdtempSync(join(verification, 'run-'))
const results = []
const execute = (name, args, cwd, expected = 0) => {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120_000,
  })
  writeFileSync(
    join(run, `${name}.log`),
    (result.stdout ?? '') + (result.stderr ?? ''),
  )
  results.push({ name, status: result.status })
  if (expected === 0) {
    assert.equal(result.status, 0, `${name}: see ${run}`)
  } else {
    assert.notEqual(result.status, 0, `${name} must reject the copied mutation`)
  }
}
execute(
  'source',
  [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
  directory,
)
execute(
  'runtime',
  [join(ui, 'node_modules/vitest/vitest.mjs'), 'run'],
  directory,
)
const emitted = join(run, 'emitted')
execute(
  'emit',
  [
    compiler,
    '-p',
    'tsconfig.emit.json',
    '--outDir',
    emitted,
    '--pretty',
    'false',
  ],
  directory,
)
const nodeModules = join(run, 'node_modules')
mkdirSync(nodeModules)
const copiedCore = join(nodeModules, 'foldkit')
mkdirSync(copiedCore)
copyFileSync(join(core, 'package.json'), join(copiedCore, 'package.json'))
cpSync(join(core, 'dist'), join(copiedCore, 'dist'), { recursive: true })
symlinkSync(
  join(repository, 'node_modules/effect'),
  join(nodeModules, 'effect'),
  'dir',
)
writeFileSync(
  join(run, 'package.json'),
  JSON.stringify({ type: 'module', private: true }),
)
writeFileSync(
  join(run, 'consumer.ts'),
  `
import { Effect, Layer } from 'effect'
import { exactAuthoringChannels } from './emitted/channels.js'
import { HostReviewBlock, makeHostProgram } from './emitted/host.js'
import { ConstructorSource, HostReviewDefinition, InvocationSource, init, update, view } from './emitted/hostContract.js'
import { ReadEffectsLayer } from './emitted/hostProvider.js'
import type * as Block from 'foldkit/block'

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends (<Value>() => Value extends Right ? 1 : 2) ? true : false
type Expect<Value extends true> = Value
export const channels: ReadonlyArray<true> = exactAuthoringChannels
export const exactServices: Expect<Equal<Layer.Services<typeof ReadEffectsLayer>, ConstructorSource | InvocationSource>> = true
export const exactProgramServices: Expect<Equal<Block.FactsOf<typeof HostReviewBlock>['programRequirements'], ConstructorSource | InvocationSource>> = true
export const checkProvision = (container: HTMLElement) => {
  const pending = makeHostProgram(container)
  // @ts-expect-error Both constructor and invocation Services remain required.
  pending.start()
  // @ts-expect-error Invocation Services remain required after supplying constructor Services.
  pending.provide(Layer.succeed(ConstructorSource, 1)).start()
  // @ts-expect-error The original handler provider must be selected before completion.
  HostReviewDefinition.makeBlock(Effect.succeed({ children: [], init, update, view, EffectsLayer: Layer.empty }))
  return pending.provide(Layer.mergeAll(Layer.succeed(ConstructorSource, 1), Layer.succeed(InvocationSource, 2))).start()
}
`,
)
writeFileSync(
  join(run, 'tsconfig.json'),
  JSON.stringify(
    {
      extends: join(repository, 'tsconfig.base.json'),
      compilerOptions: {
        noEmit: true,
        skipLibCheck: false,
        module: 'ESNext',
        moduleResolution: 'Bundler',
        types: [],
      },
      include: ['consumer.ts'],
    },
    null,
    2,
  ),
)
execute(
  'relocated-consumer',
  [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
  run,
)
const outputsPath = join(copiedCore, 'dist/block/operationOutputs.d.ts')
const original = readFileSync(outputsPath, 'utf8')
const mutated = original.replace(
  /\s+readonly \[OperationOutputsTypeId\]: \(channels: Channels\) => Channels;/u,
  '',
)
assert.notEqual(mutated, original)
writeFileSync(outputsPath, mutated)
execute(
  'lost-tag-channel-control',
  [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
  run,
  1,
)
assert.match(
  readFileSync(join(run, 'lost-tag-channel-control.log'), 'utf8'),
  /emitted\/channels\.d\.ts.*Type 'false'/u,
)
writeFileSync(outputsPath, original)
execute(
  'restored-consumer',
  [compiler, '-p', 'tsconfig.json', '--pretty', 'false'],
  run,
)
writeFileSync(
  join(run, 'results.json'),
  JSON.stringify({ status: 'passed', results }, null, 2) + '\n',
)
writeFileSync(
  join(verification, 'latest.json'),
  JSON.stringify({ run, status: 'passed' }, null, 2) + '\n',
)
process.stdout.write(`${run}\n`)
