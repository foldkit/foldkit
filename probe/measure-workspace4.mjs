import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { adapt } from '../internal/direct-block-performance/adapt.mjs'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const core = join(repository, 'packages/foldkit')
const artifacts = mkdtempSync(join(repository, 'probe/performance-workspace4-'))
const sha256 = value => createHash('sha256').update(value).digest('hex')
const walkFiles = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? walkFiles(join(directory, entry.name))
      : [join(directory, entry.name)],
  )
const files = [
  'deep-composition-8.ts',
  'wide-composition-100.ts',
  'workspace-composition-4.ts',
  'workspace-composition-8.ts',
  'workspace-shared.ts',
  'workspace-groups-4.ts',
  'workspace-groups-8.ts',
]
const targets = ['workspace-composition-4']
const sourceHashes = Object.fromEntries(
  walkFiles(join(core, 'type-performance')).map(path => [
    path.slice(core.length + 1),
    sha256(readFileSync(path)),
  ]),
)
const snapshot = join(artifacts, 'package-core')
const sourceDistHashes = Object.fromEntries(
  walkFiles(join(core, 'dist')).map(path => [
    path.slice(core.length + 1),
    sha256(readFileSync(path)),
  ]),
)
cpSync(join(core, 'dist'), join(snapshot, 'dist'), { recursive: true })
cpSync(join(core, 'package.json'), join(snapshot, 'package.json'))
for (const [path, hash] of Object.entries(sourceDistHashes)) {
  assert.equal(
    sha256(readFileSync(join(snapshot, path))),
    hash,
    `Dist changed during snapshot: ${path}`,
  )
}
const dependency = (parent, name, target) => {
  const link = join(parent, 'node_modules', name)
  mkdirSync(dirname(link), { recursive: true })
  symlinkSync(realpathSync(target), link)
}
for (const name of ['effect', 'parse5', '@effect/platform-browser']) {
  dependency(snapshot, name, join(core, 'node_modules', name))
}
const transformations = []
for (const mode of ['adapted']) {
  const directory = join(artifacts, mode)
  mkdirSync(directory)
  cpSync(join(core, 'type-performance'), join(directory, 'type-performance'), {
    recursive: true,
  })
  mkdirSync(join(directory, 'scripts'))
  cpSync(
    join(core, 'scripts/check-block-type-performance.ts'),
    join(directory, 'scripts/check-block-type-performance.ts'),
  )
  cpSync(join(core, 'package.json'), join(directory, 'package.json'))
  symlinkSync(join(snapshot, 'dist'), join(directory, 'dist'))
  dependency(directory, 'foldkit', snapshot)
  dependency(directory, 'effect', join(core, 'node_modules/effect'))
  const bin = join(directory, 'node_modules/.bin')
  mkdirSync(bin)
  const quote = text => `'${text.replaceAll("'", "'\\''")}'`
  const tsc = join(bin, 'tsc')
  writeFileSync(
    tsc,
    `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(realpathSync(join(core, 'node_modules/typescript/bin/tsc')))} "$@"\n`,
  )
  chmodSync(tsc, 0o755)
  if (mode === 'adapted') {
    for (const file of files) {
      const transformed = adapt(
        readFileSync(join(core, 'type-performance', file), 'utf8'),
        file,
      )
      writeFileSync(
        join(directory, 'type-performance', file),
        transformed.output,
      )
      transformations.push(transformed.facts)
    }
  }
}
const logs = join(artifacts, 'logs')
mkdirSync(logs)
const measurements = []
const receipt = () => ({
  repository,
  artifacts,
  node: process.version,
  compiler: JSON.parse(
    readFileSync(join(core, 'node_modules/typescript/package.json')),
  ).version,
  targets,
  sourceHashes,
  sourceDistHashes,
  transformations,
  measurements,
})
writeFileSync(
  join(artifacts, 'receipt.json'),
  JSON.stringify(receipt(), null, 2),
)
for (const mode of ['adapted']) {
  for (const fixture of targets) {
    const command = [
      join(artifacts, mode, 'scripts/check-block-type-performance.ts'),
      fixture,
    ]
    const result = spawnSync(process.execPath, command, {
      cwd: join(artifacts, mode),
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, NODE_DISABLE_COMPILE_CACHE: '1' },
    })
    assert.ifError(result.error)
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    const log = join(logs, `${mode}-${fixture}.log`)
    writeFileSync(log, output)
    const row = [
      ...output.matchAll(
        /^(\S+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(ok|failed[^\n]*)[ \t]*$/gm,
      ),
    ].at(-1)
    measurements.push({
      mode,
      fixture,
      status: result.status,
      command: [process.execPath, ...command],
      log,
      ...(row
        ? {
            instantiations: Number(row[2].replaceAll(',', '')),
            maxInstantiations: Number(row[3].replaceAll(',', '')),
            types: Number(row[4].replaceAll(',', '')),
            maxTypes: Number(row[5].replaceAll(',', '')),
            symbols: Number(row[6].replaceAll(',', '')),
            budgetStatus: row[7],
          }
        : { diagnosticFailure: true }),
    })
    writeFileSync(
      join(artifacts, 'receipt.json'),
      JSON.stringify(receipt(), null, 2),
    )
    console.log(
      mode,
      fixture,
      result.status,
      row ? `${row[2]} instantiations / ${row[4]} Types` : log,
    )
  }
}
for (const [path, hash] of Object.entries(sourceHashes)) {
  assert.equal(
    sha256(readFileSync(join(core, path))),
    hash,
    `Original fixture changed: ${path}`,
  )
}
for (const [path, hash] of Object.entries(sourceDistHashes)) {
  assert.equal(
    sha256(readFileSync(join(core, path))),
    hash,
    `Framework dist changed: ${path}`,
  )
}
writeFileSync(
  join(artifacts, 'receipt.json'),
  JSON.stringify(
    {
      ...receipt(),
      originalSourcesUnchanged: true,
      frameworkDistUnchanged: true,
    },
    null,
    2,
  ),
)
console.log(join(artifacts, 'receipt.json'))
process.exitCode = measurements.every(row => row.status === 0) ? 0 : 1
