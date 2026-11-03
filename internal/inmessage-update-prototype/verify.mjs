import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
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

const fixture = dirname(fileURLToPath(import.meta.url))
const repository = resolve(fixture, '../..')
const core = join(repository, 'packages/foldkit')
const workspace = mkdtempSync('/private/tmp/foldkit-inmessage-update-proof-')
const logs = join(workspace, 'logs')
mkdirSync(logs)
const compiler = join(core, 'node_modules/typescript/bin/tsc')
const ts6 =
  process.env.FOLDKIT_TS6_EXECUTABLE ??
  join(
    repository,
    'node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/bin/tsc',
  )
assert.ok(
  existsSync(ts6),
  'Set FOLDKIT_TS6_EXECUTABLE to TypeScript 6.0.3 bin/tsc.',
)
const sha256 = file =>
  createHash('sha256').update(readFileSync(file)).digest('hex')
const checks = []
const run = (name, args, cwd = repository, expected = 0) => {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NODE_DISABLE_COMPILE_CACHE: '1' },
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const log = join(logs, `${name}.log`)
  writeFileSync(log, output)
  assert.ifError(result.error)
  assert.equal(
    expected === 0 ? result.status === 0 : result.status !== 0,
    true,
    `${name}: ${output}`,
  )
  checks.push({ name, status: result.status, expected, log })
  console.log(`${name}: ${expected === 0 ? 'pass' : 'rejected as expected'}`)
  return output
}
const linkDependencies = root => {
  const modules = join(root, 'node_modules')
  mkdirSync(modules, { recursive: true })
  for (const entry of readdirSync(join(repository, 'node_modules'))) {
    if (entry !== 'foldkit' && !existsSync(join(modules, entry))) {
      symlinkSync(
        realpathSync(join(repository, 'node_modules', entry)),
        join(modules, entry),
      )
    }
  }
}
const stagedCore = join(workspace, 'packages/foldkit')
mkdirSync(stagedCore, { recursive: true })
cpSync(join(core, 'dist'), join(stagedCore, 'dist'), { recursive: true })
cpSync(join(core, 'package.json'), join(stagedCore, 'package.json'))
linkDependencies(workspace)
symlinkSync(stagedCore, join(workspace, 'node_modules/foldkit'))
symlinkSync(join(workspace, 'node_modules'), join(stagedCore, 'node_modules'))
assert.equal(
  realpathSync(join(workspace, 'node_modules/foldkit')),
  realpathSync(stagedCore),
)
const stagedFixture = join(workspace, 'internal/inmessage-update-prototype')
mkdirSync(stagedFixture, { recursive: true })
for (const path of ['src', 'tsconfig.json']) {
  cpSync(join(fixture, path), join(stagedFixture, path), { recursive: true })
}
writeFileSync(
  join(stagedFixture, 'package.json'),
  JSON.stringify({ private: true, type: 'module' }),
)
cpSync(
  join(repository, 'tsconfig.base.json'),
  join(workspace, 'tsconfig.base.json'),
)
const config = join(stagedFixture, 'tsconfig.json')
run(
  'source-pinned',
  [compiler, '-p', config, '--noEmit', '--pretty', 'false'],
  workspace,
)
run('declarations-ts6', [ts6, '-p', config, '--pretty', 'false'], workspace)
run(
  'runtime',
  ['--test', join(stagedFixture, 'dist/runtime.test.js')],
  workspace,
)

const rejected = join(stagedFixture, 'src/rejected.ts')
const rejectedText = readFileSync(rejected, 'utf8')
for (const [name, line, diagnostic] of [
  [
    'wrong-command-output',
    '  // @ts-expect-error Input Commands still return local Messages.',
    /SendInput|RequestedSet|Commands/,
  ],
  [
    'exact-input-payload',
    '      // @ts-expect-error This exact input has text, not value.',
    /Property 'value' does not exist/,
  ],
  [
    'foreign-composition',
    '  // @ts-expect-error Reusable bundles retain their original Composition owner.',
    /Composition|Owner|Plan/,
  ],
]) {
  assert.ok(rejectedText.includes(line))
  writeFileSync(rejected, rejectedText.replace(line, ''))
  assert.match(
    run(
      name,
      [compiler, '-p', config, '--noEmit', '--pretty', 'false'],
      workspace,
      1,
    ),
    diagnostic,
  )
  writeFileSync(rejected, rejectedText)
}

const delivery = join(stagedCore, 'dist/block/delivery.js')
const deliveryText = readFileSync(delivery, 'utf8')
assert.equal(deliveryText.match(/input\?\.validate\(message\);/g)?.length, 2)
writeFileSync(
  delivery,
  deliveryText.replaceAll('input?.validate(message);', ''),
)
run(
  'missing-decoded-input-validation',
  [
    '--test',
    '--test-name-pattern',
    'malformed input',
    join(stagedFixture, 'dist/runtime.test.js'),
  ],
  workspace,
  1,
)
writeFileSync(delivery, deliveryText)
const competing =
  "throw new Error('[foldkit] Composed update parts cannot emit competing OutMessages.');"
assert.ok(deliveryText.includes(competing))
writeFileSync(delivery, deliveryText.replace(competing, 'void 0;'))
run(
  'missing-competing-output-guard',
  [
    '--test',
    '--test-name-pattern',
    'erased shared and competing',
    join(stagedFixture, 'dist/runtime.test.js'),
  ],
  workspace,
  1,
)
writeFileSync(delivery, deliveryText)
run(
  'restored-runtime',
  ['--test', join(stagedFixture, 'dist/runtime.test.js')],
  workspace,
)

const relocated = join(workspace, 'relocated')
linkDependencies(relocated)
mkdirSync(join(relocated, 'node_modules/foldkit'))
cpSync(join(stagedCore, 'dist'), join(relocated, 'node_modules/foldkit/dist'), {
  recursive: true,
})
cpSync(
  join(stagedCore, 'package.json'),
  join(relocated, 'node_modules/foldkit/package.json'),
)
cpSync(join(stagedFixture, 'dist'), join(relocated, 'app'), { recursive: true })
for (const file of ['consumer.ts', 'smoke.mjs'])
  cpSync(join(fixture, 'external', file), join(relocated, file))
writeFileSync(
  join(relocated, 'package.json'),
  JSON.stringify({ private: true, type: 'module' }),
)
writeFileSync(
  join(relocated, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      types: ['node'],
      exactOptionalPropertyTypes: true,
    },
    files: ['consumer.ts'],
    include: [],
  }),
)
assert.equal(existsSync(join(relocated, 'node_modules/foldkit/src')), false)
assert.equal(existsSync(join(relocated, 'app/definition.ts')), false)
run(
  'strict-relocated-ts6',
  [ts6, '-p', join(relocated, 'tsconfig.json'), '--pretty', 'false'],
  relocated,
)
run('source-free-runtime', [join(relocated, 'smoke.mjs')], relocated)

const tracked = spawnSync(
  'git',
  [
    'ls-files',
    'packages/foldkit/type-performance',
    'packages/foldkit/scripts/check-block-type-performance.ts',
  ],
  { cwd: repository, encoding: 'utf8' },
)
assert.equal(tracked.status, 0)
const unchanged = spawnSync(
  'git',
  [
    'diff',
    '--exit-code',
    'HEAD',
    '--',
    'packages/foldkit/type-performance',
    'packages/foldkit/scripts/check-block-type-performance.ts',
  ],
  { cwd: repository, encoding: 'utf8' },
)
assert.equal(
  unchanged.status,
  0,
  'Compiler workloads and budgets must be unchanged.',
)
const workloads = tracked.stdout
  .trim()
  .split('\n')
  .map(path => ({ path, sha256: sha256(join(repository, path)) }))
const receipt = {
  workspace,
  node: process.version,
  framework: stagedCore,
  compiler: JSON.parse(
    readFileSync(join(core, 'node_modules/typescript/package.json')),
  ).version,
  ts6,
  checks,
  workloads,
  coreDeclarationSha256: sha256(
    join(stagedCore, 'dist/experimental/contracted/inMessageUpdate.d.ts'),
  ),
}
writeFileSync(join(workspace, 'receipt.json'), JSON.stringify(receipt, null, 2))
mkdirSync(join(fixture, 'verification'), { recursive: true })
writeFileSync(
  join(fixture, 'verification/latest.json'),
  JSON.stringify(
    { workspace, receipt: join(workspace, 'receipt.json') },
    null,
    2,
  ),
)
console.log(join(workspace, 'receipt.json'))
