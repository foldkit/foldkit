import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'

const modules = realpathSync(
  new URL('../../packages/foldkit/node_modules', import.meta.url),
)
const require = createRequire(resolve(modules, '../../../package.json'))
const ts = require('typescript')
const snapshot = process.argv.at(2)
assert.ok(snapshot, 'Pass the completed verify.mjs snapshot directory.')
const originalReceipt = JSON.parse(readFileSync(join(snapshot, 'receipt.json')))
const directory = join(snapshot, 'compact-control')
cpSync(join(snapshot, 'adapted'), directory, {
  recursive: true,
  dereference: false,
  verbatimSymlinks: true,
  errorOnExist: true,
  force: false,
})
const transformations = []
for (const entry of originalReceipt.transformations) {
  const file = join(directory, 'type-performance', entry.file)
  const source = readFileSync(file, 'utf8')
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const edits = []
  const visit = node => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ['makeBinding', 'makeMapBinding'].includes(node.expression.name.text)
    ) {
      const child = node.arguments.at(0)
      edits.push({
        start: child.getStart(parsed),
        end: child.end,
        text: `compactDescriptor(${child.getText(parsed)})`,
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  if (edits.length === 0) {
    continue
  }
  let output = source
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end)
  }
  const imports = parsed.statements.filter(ts.isImportDeclaration)
  const offset = imports.at(-1)?.end ?? 0
  const helper = `
import type { DescriptorTypeId, DeclaredBlockReaderTypeId } from '../dist/experimental/constructed/contract.js'
type DescriptorKeys = 'owner' | 'Model' | 'Message' | 'InMessage' | 'OutMessage' | 'get' | typeof DescriptorTypeId | typeof DeclaredBlockReaderTypeId
const compactDescriptor = <Value extends object>(value: Value): Pick<Value, Extract<keyof Value, DescriptorKeys>> => value
`
  output = output.slice(0, offset) + helper + output.slice(offset)
  writeFileSync(file, output)
  transformations.push({
    file: entry.file,
    wrappedBindingArguments: edits.length,
  })
}
const measurements = []
for (const fixture of originalReceipt.targets) {
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
  const log = join(snapshot, 'logs', `compact-control-${fixture}.log`)
  writeFileSync(log, output)
  const row = [
    ...output.matchAll(
      /^(\S+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(ok|failed[^\n]*)[ \t]*$/gm,
    ),
  ].at(-1)
  measurements.push({
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
  console.log(
    fixture,
    result.status,
    row ? `${row[2]} instantiations / ${row[4]} Types` : log,
  )
}
const receipt = join(snapshot, 'compact-control-receipt.json')
writeFileSync(
  receipt,
  JSON.stringify(
    {
      snapshot,
      directory,
      purpose:
        'Diagnostic only: strip authoring helpers from Binding child inputs without changing the Block object or channel facts.',
      transformations,
      measurements,
    },
    null,
    2,
  ),
)
console.log(receipt)
process.exitCode = measurements.every(row => row.status === 0) ? 0 : 1
