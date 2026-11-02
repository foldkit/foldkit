import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
)
const require = createRequire(join(repositoryRoot, 'package.json'))
const ts = require('typescript')
const beforeRoot = process.argv.at(2)
assert(beforeRoot, 'Supply the phase-start ui-src baseline directory')
const afterRoot = join(repositoryRoot, 'packages/ui/src')
const printer = ts.createPrinter({ removeComments: true })
const hash = text => createHash('sha256').update(text).digest('hex')
const files = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? files(join(directory, entry.name))
      : [join(directory, entry.name)],
  )
const assertions = (path, text) => {
  const source = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const found = []
  const isAssertion = expression => {
    if (ts.isPropertyAccessExpression(expression))
      return (
        expression.name.text.startsWith('expect') ||
        isAssertion(expression.expression)
      )
    if (ts.isCallExpression(expression))
      return isAssertion(expression.expression)
    return ts.isIdentifier(expression) && expression.text === 'expect'
  }
  const walk = node => {
    if (
      ts.isCallExpression(node) &&
      isAssertion(node.expression) &&
      !ts.isIdentifier(node.expression)
    )
      found.push(printer.printNode(ts.EmitHint.Expression, node, source))
    ts.forEachChild(node, walk)
  }
  walk(source)
  return found
}
const contains = (original, current) => {
  let offset = 0
  for (const item of current) if (item === original.at(offset)) offset += 1
  return offset === original.length
}
const records = files(beforeRoot)
  .filter(path => path.endsWith('.test.ts'))
  .map(beforePath => {
    const path = relative(beforeRoot, beforePath)
    const before = readFileSync(beforePath, 'utf8')
    const after = readFileSync(join(afterRoot, path), 'utf8')
    const original = assertions(path, before)
    const current = assertions(path, after)
    assert(
      contains(original, current),
      `Assertions changed or disappeared in ${path}`,
    )
    return {
      path,
      beforeSha256: hash(before),
      afterSha256: hash(after),
      originalAssertions: original.length,
      currentAssertions: current.length,
    }
  })
const control = records.find(record => record.originalAssertions > 0)
const original = assertions(
  control.path,
  readFileSync(join(beforeRoot, control.path), 'utf8'),
)
assert.equal(
  contains(original, original.slice(1)),
  false,
  'Dropping one assertion must fail preservation',
)
const result = {
  baseline: beforeRoot,
  files: records.length,
  originalAssertions: records.reduce(
    (total, record) => total + record.originalAssertions,
    0,
  ),
  currentAssertions: records.reduce(
    (total, record) => total + record.currentAssertions,
    0,
  ),
  assertionRemovalControl: 'rejected',
  records,
}
const destination = join(
  dirname(fileURLToPath(import.meta.url)),
  'ui-direct-aliases-preservation.json',
)
writeFileSync(destination, `${JSON.stringify(result, null, 2)}\n`)
console.log(
  JSON.stringify({
    destination,
    ...Object.fromEntries(
      Object.entries(result).filter(([key]) => key !== 'records'),
    ),
  }),
)
