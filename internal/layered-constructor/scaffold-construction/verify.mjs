import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const fixture = dirname(fileURLToPath(import.meta.url))
const repository = resolve(fixture, '../../..')
const cli = join(repository, 'packages/create-foldkit-app')
const require = createRequire(join(cli, 'package.json'))
const { Effect } = await import(pathToFileURL(require.resolve('effect')).href)
const { NodeServices } = await import(
  pathToFileURL(require.resolve('@effect/platform-node')).href
)
const { createProject } = await import(
  pathToFileURL(join(cli, 'dist/utils/files.js')).href
)
const { Scaffold } = await import(
  pathToFileURL(join(cli, 'dist/rendering.js')).href
)
const artifacts = mkdtempSync(join(fixture, 'verification-'))
const results = {
  node: process.version,
  dependencyMode:
    'existing local candidate package links; no package installation or publication',
  checks: [],
}
function run(name, args, cwd = repository, env = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 120_000,
  })
  writeFileSync(
    join(artifacts, `${name}.log`),
    `${result.stdout ?? ''}${result.stderr ?? ''}`,
  )
  results.checks.push({
    name,
    status: result.status,
    error: result.error?.message,
  })
  assert.equal(
    result.status,
    0,
    `${name}: ${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`,
  )
}
function dependencies(source, target) {
  mkdirSync(target, { recursive: true })
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const from = join(source, entry.name)
    const to = join(target, entry.name)
    if (entry.name.startsWith('@')) {
      dependencies(from, to)
    } else {
      try {
        symlinkSync(realpathSync(from), to)
      } catch (error) {
        if (error.code !== 'EEXIST') throw error
      }
    }
  }
}
try {
  const packages = Object.fromEntries(
    readdirSync(join(repository, 'packages')).flatMap(name => {
      try {
        const pkg = JSON.parse(
          readFileSync(
            join(repository, 'packages', name, 'package.json'),
            'utf8',
          ),
        )
        return pkg.private === true ? [] : [[pkg.name, pkg.version]]
      } catch {
        return []
      }
    }),
  )
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repository,
    encoding: 'utf8',
  })
  assert.equal(commit.status, 0)
  const manifest = join(artifacts, 'release-input.json')
  writeFileSync(
    manifest,
    JSON.stringify(
      {
        schemaVersion: 1,
        channel: 'stable',
        sourceCommit: commit.stdout.trim(),
        packages,
      },
      null,
      2,
    ),
  )
  run(
    'build-template-artifact',
    [join(cli, 'scripts/build-templates.mjs')],
    cli,
    { FOLDKIT_RELEASE_MANIFEST: manifest },
  )
  for (const [name, scaffold] of [
    ['csr', Scaffold.Spa({ example: 'counter' })],
    ['ssg', Scaffold.Ssg()],
    ['ssr', Scaffold.Ssr()],
  ]) {
    const project = join(artifacts, name)
    await Effect.runPromise(
      createProject(`construction-${name}`, project, scaffold, 'pnpm').pipe(
        Effect.provide(NodeServices.layer),
      ),
    )
    dependencies(
      join(repository, 'examples/counter/node_modules'),
      join(project, 'node_modules'),
    )
    dependencies(
      join(repository, 'examples/ssr/node_modules'),
      join(project, 'node_modules'),
    )
    dependencies(
      join(repository, 'node_modules'),
      join(project, 'node_modules'),
    )
    assert.equal(
      realpathSync(join(project, 'node_modules/effect')),
      realpathSync(join(repository, 'node_modules/effect')),
    )
    run(
      `${name}-types`,
      [
        join(repository, 'packages/foldkit/node_modules/typescript/bin/tsc'),
        '--noEmit',
        '--pretty',
        'false',
      ],
      project,
    )
    run(
      `${name}-tests`,
      [join(repository, 'packages/ui/node_modules/vitest/vitest.mjs'), 'run'],
      project,
    )
    run(
      `${name}-build`,
      [join(repository, 'node_modules/vite/bin/vite.js'), 'build'],
      project,
    )
  }
  results.status = 'passed'
} finally {
  writeFileSync(
    join(artifacts, 'results.json'),
    JSON.stringify(results, null, 2),
  )
  process.stdout.write(`${artifacts}\n`)
}
