import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const repository = resolve(directory, '../../..')
const core = resolve(repository, 'packages/foldkit')
const verification = resolve(directory, 'verification')
mkdirSync(verification, { recursive: true })
const output = mkdtempSync(resolve(verification, 'builder-reuse-'))
const copied = resolve(output, 'package')
mkdirSync(copied)
cpSync(resolve(core, 'src'), resolve(copied, 'src'), { recursive: true })
for (const file of ['package.json', 'vitest.config.ts']) {
  cpSync(resolve(core, file), resolve(copied, file))
}
symlinkSync(
  realpathSync(resolve(core, 'node_modules')),
  resolve(copied, 'node_modules'),
)

const runtime = 'src/experimental/constructed/runtime.ts'
const original = readFileSync(resolve(copied, runtime), 'utf8')
const initialHash = createHash('sha256')
  .update(readFileSync(resolve(core, runtime)))
  .digest('hex')
const results = []

const run = (name, testName, expectedFailure) => {
  const args = [
    resolve(core, 'node_modules/vitest/vitest.mjs'),
    'run',
    '--config',
    resolve(copied, 'vitest.config.ts'),
    'src/experimental/contracted/builderReuse.test.ts',
  ]
  if (testName !== undefined) args.push('-t', testName)
  const result = spawnSync(process.execPath, args, {
    cwd: copied,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  })
  assert.ifError(result.error)
  const log = (result.stdout ?? '') + (result.stderr ?? '')
  writeFileSync(resolve(output, `${name}.log`), log)
  results.push({
    name,
    status: result.status,
    expected: expectedFailure ? 'fail' : 'pass',
  })
  writeFileSync(
    resolve(output, 'results.json'),
    JSON.stringify(results, null, 2) + '\n',
  )
  if (expectedFailure) {
    assert.notEqual(result.status, 0, `${name} unexpectedly passed`)
    assert.match(log, expectedFailure)
    assert.match(log, new RegExp(testName))
  } else {
    assert.equal(result.status, 0, `${name}:\n${log}`)
  }
}

run('baseline', undefined, false)

const start = original.indexOf('const makeBuilderAdapter = (')
const end = original.indexOf(
  '/** @internal Compiles one declared input protocol',
  start,
)
assert(start >= 0 && end > start)
const perRenderProxy = `const makeBuilderAdapter = (environment: OperationEnvironment) =>
  (builder: object): object => new Proxy(builder, {
    get(target, key, receiver) {
      if (key !== 'block') return Reflect.get(target, key, receiver)
      return (embedding: object) => {
        const symbolic = symbolicEmbeddingOf(embedding)
        if (symbolic === undefined) return Reflect.apply(Reflect.get(target, 'block'), target, [embedding])
        const actual = environment.get(symbolic.binding)
        if (actual === undefined) throw new Error('[foldkit] This view uses an unconnected Binding.')
        const resolved = Reflect.apply(Reflect.get(actual, 'embedView'), actual, [symbolic.config])
        return Reflect.apply(Reflect.get(target, 'block'), target, [resolved])
      }
    },
  })

`
try {
  writeFileSync(
    resolve(copied, runtime),
    original.slice(0, start) + perRenderProxy + original.slice(end),
  )
  run(
    'old-per-render-allocation',
    'retains lazy results when an ordinary view passes its builder',
    /expected "vi.fn\(\)" to be called 1 times, but got 4 times/,
  )
} finally {
  writeFileSync(resolve(copied, runtime), original)
}

const cacheDeclaration = '  const builders = new WeakMap<object, object>()\n'
assert(original.includes(cacheDeclaration))
try {
  writeFileSync(
    resolve(copied, runtime),
    'const builders = new WeakMap<object, object>()\n\n' +
      original.replace(cacheDeclaration, ''),
  )
  run(
    'global-acquisition-cache',
    'keeps adapters isolated between acquisitions with different child implementations',
    /Block binding "child" is not registered in this view's bindings\./,
  )
} finally {
  writeFileSync(resolve(copied, runtime), original)
}

run('restored', undefined, false)
assert.equal(
  createHash('sha256')
    .update(readFileSync(resolve(core, runtime)))
    .digest('hex'),
  initialHash,
  'The copied proof changed canonical runtime source.',
)
process.stdout.write(output + '\n')
