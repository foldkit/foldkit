import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, readFileSync, writeFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
const modules = realpathSync(
  new URL('../../packages/foldkit/node_modules', import.meta.url),
)
const require = createRequire(resolve(modules, '../../../package.json'))
const ts = require('typescript')
const snapshot = process.argv.at(2)
assert.ok(snapshot)
const prior = JSON.parse(readFileSync(join(snapshot, 'receipt.json')))
const directory = join(snapshot, 'constructor-control')
cpSync(join(snapshot, 'adapted'), directory, {
  recursive: true,
  dereference: false,
  verbatimSymlinks: true,
  errorOnExist: true,
  force: false,
})
const transformations = []
const member = (node, name) =>
  ts.isPropertyAccessExpression(node) && node.name.text === name
for (const entry of prior.transformations) {
  const file = join(directory, 'type-performance', entry.file)
  const source = readFileSync(file, 'utf8')
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const edits = []
  const replace = (node, text) =>
    edits.push({ start: node.getStart(parsed), end: node.end, text })
  const implementations = new Map(
    entry.blocks.map(block => [
      block.block.replace(/Block$/, ''),
      `${block.block.replace(/Block$/, '')}Implementation`,
    ]),
  )
  for (const statement of parsed.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      statement.getText(parsed).includes('SelectedLayerFacts')
    ) {
      replace(statement, '')
      continue
    }
    if (!ts.isVariableStatement(statement)) {
      continue
    }
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
        continue
      }
      const name = declaration.name.text
      const block = entry.blocks.find(block => block.definition === name)
      if (block) {
        assert.ok(
          ts.isCallExpression(declaration.initializer) &&
            member(declaration.initializer.expression, 'make'),
        )
        replace(declaration.initializer.expression, 'Block.makeDefinition')
        continue
      }
      const completed = entry.blocks.find(
        block => `${block.block.replace(/Block$/, '')}Layer` === name,
      )
      if (completed) {
        const original = declaration.initializer
        const provided =
          ts.isCallExpression(original) &&
          member(original.expression, 'provide')
        const make = provided ? original.arguments.at(0) : original
        assert.ok(
          ts.isCallExpression(make) && member(make.expression, 'makeLayer'),
        )
        const construct = make.arguments.at(0).getText(parsed)
        const dependency = provided
          ? original.arguments.at(1).getText(parsed)
          : undefined
        const implementation = implementations.get(
          completed.block.replace(/Block$/, ''),
        )
        const exported = statement.modifiers?.some(
          mod => mod.kind === ts.SyntaxKind.ExportKeyword,
        )
          ? 'export '
          : ''
        replace(
          statement,
          `${exported}const ${implementation} = ${completed.definition}.makeBlock(${construct})${dependency ? `.provide(${dependency})` : ''}\n${exported}const ${name} = ${implementation}.layer`,
        )
        continue
      }
      const alias = entry.blocks.find(block => block.block === name)
      if (alias) {
        replace(
          declaration.initializer,
          alias.block === 'ApplicationBlock'
            ? 'ApplicationImplementation'
            : `${alias.definition}.contract`,
        )
      }
    }
  }
  const visit = node => {
    if (ts.isCallExpression(node) && member(node.expression, 'makeElement')) {
      const config = node.arguments.at(0)
      assert.ok(ts.isObjectLiteralExpression(config))
      replace(
        config,
        `{${config.properties
          .filter(p => p.name?.getText(parsed) !== 'layer')
          .map(p => p.getText(parsed))
          .join(',')}}`,
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  let output = source
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end)
  }
  output = output.replace(
    /SelectedLayerFacts<typeof (\w+)Layer, typeof (\w+)\.owner>/g,
    (_match, base) => `Block.FactsOf<typeof ${base}Implementation>`,
  )
  writeFileSync(file, output)
  transformations.push({
    file: entry.file,
    blocks: entry.blocks.length,
    contractBodiesAndMetadataFrom:
      'adapted snapshot; makeLayer constructor expression retained verbatim',
  })
}
const measurements = []
for (const fixture of ['deep-composition-8']) {
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
  const log = join(snapshot, 'logs', `constructor-control-${fixture}.log`)
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
const receipt = join(snapshot, 'constructor-control-receipt.json')
writeFileSync(
  receipt,
  JSON.stringify(
    {
      snapshot,
      directory,
      purpose:
        'Matched existing independent-contract constructor API control, not native prepare/assemble.',
      transformations,
      measurements,
    },
    null,
    2,
  ),
)
console.log(receipt)
process.exitCode = measurements.every(row => row.status === 0) ? 0 : 1
