import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  readFileSync,
  writeFileSync,
  realpathSync,
  unlinkSync,
  symlinkSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
const repository = resolve(dirname(new URL(import.meta.url).pathname), '../..')
const modules = realpathSync(join(repository, 'packages/foldkit/node_modules'))
const require = createRequire(resolve(modules, '../../../package.json'))
const ts = require('typescript')
const snapshot = process.argv.at(2)
assert.ok(snapshot)
const directory = join(snapshot, 'base-constructor-control')
const packageCore = join(snapshot, 'base-constructor-package')
cpSync(join(snapshot, 'constructor-control'), directory, {
  recursive: true,
  dereference: false,
  verbatimSymlinks: true,
  errorOnExist: true,
  force: false,
})
cpSync(join(snapshot, 'package-core'), packageCore, {
  recursive: true,
  dereference: false,
  verbatimSymlinks: true,
  errorOnExist: true,
  force: false,
})
for (const [link, target] of [
  [join(directory, 'dist'), join(packageCore, 'dist')],
  [join(directory, 'node_modules/foldkit'), packageCore],
]) {
  unlinkSync(link)
  symlinkSync(target, link)
}
const base = spawnSync(
  'git',
  ['show', 'HEAD:packages/foldkit/src/experimental/contracted/contract.ts'],
  { cwd: repository, encoding: 'utf8' },
)
assert.equal(base.status, 0)
const original = ts.createSourceFile(
  'base.ts',
  base.stdout,
  ts.ScriptTarget.Latest,
  true,
)
const file = join(packageCore, 'dist/experimental/contracted/contract.d.ts')
const source = readFileSync(file, 'utf8')
const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
const facts = ast =>
  ast.statements
    .find(
      node => ts.isInterfaceDeclaration(node) && node.name.text === 'MakeBlock',
    )
    .members.at(0)
    .type.typeArguments.at(4)
const before = facts(parsed)
const after = facts(original).getText(original)
writeFileSync(
  file,
  source.slice(0, before.getStart(parsed)) + after + source.slice(before.end),
)
const fixture = 'deep-composition-8'
const command = [
  join(directory, 'scripts/check-block-type-performance.ts'),
  fixture,
]
const result = spawnSync(process.execPath, command, {
  cwd: directory,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
  env: { ...process.env, NODE_DISABLE_COMPILE_CACHE: '1' },
})
assert.ifError(result.error)
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
const log = join(
  snapshot,
  'logs',
  'base-constructor-control-deep-composition-8.log',
)
writeFileSync(log, output)
const row = [
  ...output.matchAll(
    /^(\S+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(ok|failed[^\n]*)[ \t]*$/gm,
  ),
].at(-1)
const receipt = join(snapshot, 'base-constructor-control-receipt.json')
writeFileSync(
  receipt,
  JSON.stringify(
    {
      snapshot,
      directory,
      packageCore,
      purpose:
        'Matched independent contract constructor API with only the pre-prototype MakeBlock return Facts restored from base HEAD. All validation remains current.',
      declarationControl: { before: before.getText(parsed), after },
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
    },
    null,
    2,
  ),
)
console.log(row ? `${row[2]} instantiations / ${row[4]} Types` : log)
console.log(receipt)
process.exitCode = result.status ?? 1
