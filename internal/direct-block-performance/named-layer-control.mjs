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
const directory = join(snapshot, 'named-layer-control')
const packageCore = join(snapshot, 'named-layer-package')
cpSync(join(snapshot, 'adapted'), directory, {
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
const file = join(packageCore, 'dist/experimental/contracted/contract.d.ts')
const source = readFileSync(file, 'utf8')
const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
const current = ts.createSourceFile(
  'current.ts',
  readFileSync(
    join(
      repository,
      'packages/foldkit/src/experimental/contracted/contract.ts',
    ),
    'utf8',
  ),
  ts.ScriptTarget.Latest,
  true,
)
const printer = ts.createPrinter()
const edits = ['MakeLayer', 'LayerWithImplementationFacts'].map(name => {
  const before = parsed.statements.find(node => node.name?.text === name)
  const after = current.statements.find(node => node.name?.text === name)
  assert.ok(before && after)
  return {
    name,
    start: before.getStart(parsed),
    end: before.end,
    before: before.getText(parsed),
    after: printer.printNode(ts.EmitHint.Unspecified, after, current),
  }
})
let output = source
for (const edit of edits.toSorted((a, b) => b.start - a.start)) {
  output = output.slice(0, edit.start) + edit.after + output.slice(edit.end)
}
writeFileSync(file, output)
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
const compilerOutput = `${result.stdout ?? ''}${result.stderr ?? ''}`
const log = join(snapshot, 'logs', 'named-layer-control-deep-composition-8.log')
writeFileSync(log, compilerOutput)
const row = [
  ...compilerOutput.matchAll(
    /^(\S+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(ok|failed[^\n]*)[ \t]*$/gm,
  ),
].at(-1)
const receipt = join(snapshot, 'named-layer-control-receipt.json')
writeFileSync(
  receipt,
  JSON.stringify(
    {
      snapshot,
      directory,
      packageCore,
      purpose:
        'Same raw Layer workload; replace only MakeLayer/LayerWithImplementationFacts with owner-authorized named interface source encoding in copied declarations.',
      declarationControl: edits,
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
