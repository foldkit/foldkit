import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixture = dirname(fileURLToPath(import.meta.url))
const repository = resolve(fixture, '../../..')
mkdirSync(resolve(fixture, 'verification'), { recursive: true })
const artifacts = mkdtempSync(resolve(fixture, 'verification/run-'))
const compiler = resolve(
  repository,
  'packages/foldkit/node_modules/typescript/bin/tsc',
)
const apps = [
  { name: 'workspace', directory: 'examples/workspace' },
  { name: 'job-application', directory: 'examples/job-application' },
  { name: 'website', directory: 'packages/website' },
]
const files = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? files(resolve(directory, entry.name))
      : [resolve(directory, entry.name)],
  )
const frameworkHash = () => {
  const hash = createHash('sha256')
  for (const name of ['foldkit', 'ui']) {
    for (const file of files(
      resolve(repository, 'packages', name, 'dist'),
    ).sort()) {
      hash.update(file.slice(repository.length))
      hash.update(readFileSync(file))
    }
  }
  return hash.digest('hex')
}
const results = {
  node: process.version,
  compiler,
  artifacts,
  initialFrameworkHash: frameworkHash(),
  apps: [],
}

try {
  const checks = await Promise.allSettled(
    apps.map(async app => {
      const outDir = resolve(artifacts, app.name, 'emitted')
      const config = resolve(artifacts, app.name + '.json')
      writeFileSync(
        config,
        JSON.stringify(
          {
            extends: resolve(repository, app.directory, 'tsconfig.json'),
            compilerOptions: {
              noEmit: false,
              declaration: true,
              declarationMap: false,
              emitDeclarationOnly: true,
              incremental: false,
              composite: false,
              rootDir: repository,
              outDir,
            },
          },
          null,
          2,
        ) + '\n',
      )
      const args = [compiler, '-p', config, '--pretty', 'false']
      const child = spawn(process.execPath, args, {
        cwd: repository,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let output = ''
      child.stdout.on('data', chunk => {
        output += chunk
      })
      child.stderr.on('data', chunk => {
        output += chunk
      })
      const status = await new Promise((done, reject) => {
        child.on('error', reject)
        child.on('exit', done)
      })
      writeFileSync(resolve(artifacts, app.name + '-emit.log'), output)
      const rootHeader = resolve(outDir, app.directory, 'src/block.d.ts')
      const result = {
        ...app,
        status,
        command: [process.execPath, ...args],
        rootHeader,
        headerBytes: existsSync(rootHeader)
          ? readFileSync(rootHeader).byteLength
          : null,
      }
      results.apps.push(result)
      process.stdout.write(JSON.stringify(result) + '\n')
      assert.equal(
        status,
        0,
        `${app.name} declaration emission failed\n${output}`,
      )
    }),
  )
  results.finalFrameworkHash = frameworkHash()
  results.frameworkUnchanged =
    results.finalFrameworkHash === results.initialFrameworkHash
  results.status =
    results.frameworkUnchanged &&
    checks.every(check => check.status === 'fulfilled')
      ? 'passed'
      : 'failed'
  for (const check of checks) {
    if (check.status === 'rejected') {
      process.stderr.write(globalThis.String(check.reason) + '\n')
    }
  }
  if (results.status === 'failed') {
    process.exitCode = 1
  }
} finally {
  writeFileSync(
    resolve(artifacts, 'emission-results.json'),
    JSON.stringify(results, null, 2) + '\n',
  )
  process.stdout.write(artifacts + '\n')
}
