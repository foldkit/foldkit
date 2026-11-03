import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const repository = resolve(directory, '../../..')
const mode = process.argv[2] ?? 'source'
assert.ok(['source', 'build', 'test'].includes(mode))
const selected = process.argv.slice(3)
const packages = readdirSync(join(repository, 'examples'), {
  withFileTypes: true,
})
  .filter(
    entry =>
      entry.isDirectory() &&
      existsSync(join(repository, 'examples', entry.name, 'package.json')),
  )
  .map(entry => join('examples', entry.name))
  .concat([
    'packages/typing-game/shared',
    'packages/typing-game/client',
    'packages/typing-game/server',
  ])
  .filter(
    path =>
      selected.length === 0 ||
      selected.includes(path) ||
      selected.includes(path.split('/').at(-1)),
  )
const verification = join(directory, 'verification')
mkdirSync(verification, { recursive: true })
const artifacts = mkdtempSync(join(verification, `${mode}-`))
const report = { mode, node: process.version, status: 'running', results: [] }
const save = () => {
  writeFileSync(
    join(artifacts, 'results.json'),
    JSON.stringify(report, null, 2) + '\n',
  )
  writeFileSync(
    join(verification, `latest-${mode}.json`),
    JSON.stringify({ artifacts, status: report.status }, null, 2) + '\n',
  )
}
const files = path =>
  !existsSync(path)
    ? []
    : readdirSync(path, { withFileTypes: true }).flatMap(entry => {
        const file = join(path, entry.name)
        return entry.isDirectory() ? files(file) : [file]
      })
const hash = path => {
  const digest = createHash('sha256')
  for (const file of [
    join(path, 'package.json'),
    ...files(join(path, 'src')),
  ].sort()) {
    digest.update(relative(path, file)).update(readFileSync(file))
  }
  return digest.digest('hex')
}
const nodeDirectory = dirname(process.execPath)
for (const path of packages) {
  const cwd = join(repository, path)
  const manifest = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
  const before = hash(cwd)
  if (mode === 'test' && !manifest.scripts?.test) {
    report.results.push({
      path,
      package: manifest.name,
      status: 'skipped',
      reason: 'package.json has no test script',
      command: null,
      exitCode: null,
      sourceChangedDuring: false,
      sourceHash: before,
    })
    save()
    process.stdout.write(`${path}: skipped (package.json has no test script)\n`)
    continue
  }
  const args =
    mode === 'source'
      ? ['run', 'typecheck']
      : mode === 'test'
        ? ['run', 'test']
        : manifest.scripts?.build
          ? ['run', 'build']
          : ['exec', 'vite', 'build']
  const result = spawnSync(process.env.FOLDKIT_VERIFY_PNPM ?? 'pnpm', args, {
    cwd,
    env: {
      ...process.env,
      PATH: `${nodeDirectory}:${process.env.PATH}`,
      npm_config_manage_package_manager_versions: 'false',
    },
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 32 * 1024 * 1024,
  })
  writeFileSync(
    join(artifacts, path.replaceAll('/', '-') + '.log'),
    (result.stdout ?? '') + (result.stderr ?? ''),
  )
  const after = hash(cwd)
  const row = {
    path,
    package: manifest.name,
    script: mode === 'test' ? manifest.scripts.test : undefined,
    command: `pnpm ${args.join(' ')}`,
    exitCode: result.status,
    signal: result.signal,
    sourceChangedDuring: before !== after,
    sourceHash: after,
  }
  report.results.push(row)
  save()
  process.stdout.write(
    `${path}: ${result.status === 0 ? 'passed' : 'FAILED'}${row.sourceChangedDuring ? ' (source changed during check)' : ''}\n`,
  )
}
report.status = report.results.every(
  result =>
    result.status === 'skipped' ||
    (result.exitCode === 0 && !result.sourceChangedDuring),
)
  ? 'passed'
  : 'failed'
report.counts = {
  total: report.results.length,
  passed: report.results.filter(
    result => result.exitCode === 0 && !result.sourceChangedDuring,
  ).length,
  failed: report.results.filter(
    result =>
      result.status !== 'skipped' &&
      (result.exitCode !== 0 || result.sourceChangedDuring),
  ).length,
  skipped: report.results.filter(result => result.status === 'skipped').length,
}
save()
process.stdout.write(`Results: ${join(artifacts, 'results.json')}\n`)
if (report.status !== 'passed') process.exitCode = 1
