import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const root = resolve(directory, '../../..')
const results = join(directory, 'verification')
const modules = join(directory, 'node_modules')
const localPackage = join(modules, 'foldkit')
const canonicalPackage = join(root, 'packages/foldkit')

mkdirSync(results, { recursive: true })
mkdirSync(modules, { recursive: true })

if (!existsSync(localPackage)) {
  symlinkSync(canonicalPackage, localPackage, 'dir')
}

if (realpathSync(localPackage) !== realpathSync(canonicalPackage)) {
  throw new Error(
    'The review must resolve the current isolated Foldkit package.',
  )
}

for (const [name, executable, args] of [
  [
    'source',
    join(canonicalPackage, 'node_modules/.bin/tsc'),
    ['-p', join(directory, 'tsconfig.json'), '--noEmit', '--pretty', 'false'],
  ],
  [
    'runtime',
    join(canonicalPackage, 'node_modules/.bin/vitest'),
    [
      'run',
      '--environment',
      'happy-dom',
      join(directory, 'conditional-provider.test.ts'),
      join(directory, 'routed-only.test.ts'),
    ],
  ],
]) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8' })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(join(results, `${name}.log`), output || `${name} passed.\n`)

  if (result.status !== 0) {
    throw new Error(`${name} failed:\n${output}`)
  }
}

process.stdout.write(`Contract review gates passed. Logs: ${results}\n`)
