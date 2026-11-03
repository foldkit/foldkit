import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const root = resolve(directory, '../../..')
const verification = join(directory, 'verification')
mkdirSync(verification, { recursive: true })
const output = mkdtempSync(join(verification, 'run-'))
const fixture = mkdtempSync(join(tmpdir(), 'foldkit-packed-dependencies-'))
const packs = join(fixture, 'packs')
mkdirSync(packs)
const isRuntimeDependencyControl = process.argv.includes(
  '--restore-runtime-rimraf',
)
const receipt = {
  status: 'running',
  checks: [],
  fixtureCleaned: false,
  isRuntimeDependencyControl,
}

const run = (name, command, args, cwd = fixture) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 180_000,
    env: { ...process.env, npm_config_engine_strict: 'true' },
  })
  writeFileSync(join(output, `${name}.log`), result.stdout + result.stderr)
  receipt.checks.push({ name, exit: result.status })
  assert.equal(result.status, 0, `${name} failed; see ${output}`)
  return result.stdout
}

try {
  const dependencies = {
    effect: '4.1.0',
    '@effect/platform-browser': '4.1.0',
    '@effect/platform-node': '4.1.0',
    '@effect/platform-node-shared': '4.1.0',
  }

  for (const packageName of ['foldkit', 'devtools-mcp', 'create-foldkit-app']) {
    const metadata = JSON.parse(
      readFileSync(join(root, 'packages', packageName, 'package.json'), 'utf8'),
    )
    const packed = JSON.parse(
      run(
        `pack-${packageName}`,
        'npm',
        ['pack', '--ignore-scripts', '--json', '--pack-destination', packs],
        join(root, 'packages', packageName),
      ),
    )
    const first = packed.at(0)
    assert(first)

    if (packageName === 'create-foldkit-app' && isRuntimeDependencyControl) {
      const restored = join(fixture, 'restored-cli')
      mkdirSync(restored)
      run('unpack-control', 'tar', [
        '-xzf',
        join(packs, first.filename),
        '-C',
        restored,
      ])
      const manifestPath = join(restored, 'package/package.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      manifest.dependencies.rimraf = '^6.1.3'
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      run(
        'pack-control',
        'npm',
        ['pack', '--ignore-scripts', '--json', '--pack-destination', packs],
        join(restored, 'package'),
      )
    }

    dependencies[metadata.name] = `file:${join(packs, first.filename)}`
  }

  writeFileSync(
    join(fixture, 'package.json'),
    JSON.stringify({ private: true, type: 'module', dependencies }, null, 2) +
      '\n',
  )
  run('install', 'npm', [
    'install',
    '--strict-peer-deps',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
  ])
  run('tree', 'npm', ['ls', '--all', '--json'])

  const lock = JSON.parse(
    readFileSync(join(fixture, 'package-lock.json'), 'utf8'),
  )
  copyFileSync(
    join(fixture, 'package-lock.json'),
    join(output, 'package-lock.json'),
  )
  const versions = {}

  for (const name of [
    '@modelcontextprotocol/sdk',
    '@hono/node-server',
    'zod',
    'body-parser',
    'ip-address',
    'fast-uri',
    'qs',
  ]) {
    const installed = lock.packages[`node_modules/${name}`]
    assert(installed, `Missing ${name} in ordinary npm install`)
    versions[name] = installed.version
  }

  for (const name of ['rimraf', 'glob', 'minimatch']) {
    assert(
      !Object.keys(lock.packages).some(key =>
        key.endsWith(`/node_modules/${name}`),
      ),
      `Build-only ${name} leaked into the ordinary install`,
    )
    assert.equal(lock.packages[`node_modules/${name}`], undefined)
  }

  receipt.installedVersions = versions
  run('audit', 'npm', ['audit', '--omit=dev', '--json'])
  copyFileSync(
    join(directory, 'packed-protocol.mjs'),
    join(fixture, 'protocol.mjs'),
  )
  run('protocol', process.execPath, ['protocol.mjs'])
  receipt.status = 'passed'
} catch (error) {
  receipt.status = 'failed'
  throw error
} finally {
  rmSync(fixture, { recursive: true, force: true })
  receipt.fixtureCleaned = true
  writeFileSync(
    join(output, 'results.json'),
    JSON.stringify(receipt, null, 2) + '\n',
  )
  console.log(join(output, 'results.json'))
}
