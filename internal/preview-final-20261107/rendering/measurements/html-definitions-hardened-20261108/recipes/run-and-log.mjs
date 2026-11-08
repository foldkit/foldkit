import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const [outputPath, cwd, command, ...args] = process.argv.slice(2)
if (outputPath === undefined || cwd === undefined || command === undefined) {
  throw new Error('usage: run-and-log.mjs OUTPUT CWD COMMAND ...ARGS')
}

const startedAt = new Date().toISOString()
const result = spawnSync(command, args, {
  cwd,
  encoding: 'utf8',
  env: { ...process.env, CI: '1', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', NO_COLOR: '1' },
  maxBuffer: 128 * 1024 * 1024,
})
const endedAt = new Date().toISOString()
const output = [
  `startedAt=${startedAt}`,
  `endedAt=${endedAt}`,
  `cwd=${cwd}`,
  `command=${JSON.stringify([command, ...args])}`,
  `exit=${result.status}`,
  '',
  'stdout:',
  result.stdout ?? '',
  '',
  'stderr:',
  result.stderr ?? '',
].join('\n')

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, output)
process.stdout.write(output)
process.exitCode = result.status ?? 1
