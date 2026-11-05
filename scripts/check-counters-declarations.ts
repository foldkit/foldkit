import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = mkdtempSync(join(tmpdir(), 'foldkit-counters-declarations-'))
const compiler = join(
  repository,
  'packages/foldkit/node_modules/typescript/bin/tsc',
)
const result = spawnSync(
  process.execPath,
  [
    compiler,
    '-p',
    join(repository, 'examples/counters/tsconfig.json'),
    '--noEmit',
    'false',
    '--declaration',
    '--emitDeclarationOnly',
    '--outDir',
    output,
    '--rootDir',
    repository,
    '--incremental',
    'false',
    '--pretty',
    'false',
  ],
  { cwd: repository, encoding: 'utf8' },
)

if (
  result.error !== undefined ||
  result.status !== 0 ||
  !existsSync(join(output, 'examples/counters/src/block.d.ts'))
) {
  process.stderr.write(`Counters declaration artifacts retained at ${output}\n`)
  throw new Error(
    `The actual Counters application must emit declarations.\n${result.stdout ?? ''}${result.stderr ?? ''}`,
    { cause: result.error },
  )
}

rmSync(output, { recursive: true, force: true })
process.stdout.write('Actual Counters application declarations passed.\n')
