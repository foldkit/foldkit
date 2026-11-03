import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = dirname(fileURLToPath(import.meta.url))
const read = file => readFileSync(resolve(root, file), 'utf8')

const expressions = (source, name) => {
  const sourceFile = ts.createSourceFile(
    'fixture.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const found = []
  const canonical = node => {
    const children = []

    ts.forEachChild(node, child => {
      children.push(canonical(child))
    })

    return {
      kind: node.kind,
      ...(node.text === undefined ? {} : { text: node.text }),
      children,
    }
  }
  const visit = node => {
    if (
      ts.isCallExpression(node) &&
      ((ts.isIdentifier(node.expression) && node.expression.text === name) ||
        (ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === name))
    ) {
      found.push(canonical(node))
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return found
}

const generated = read('src/placements.ts')

for (const [file, name] of [
  ['src/chatRoom/composition.ts', 'makeBinding'],
  ['src/chatRoom/update.ts', 'makeUpdate'],
  ['src/chatRoom/inMessageUpdate.ts', 'makeInMessageUpdate'],
]) {
  const original = expressions(read(file), name)
  const placements = expressions(generated, name)

  assert.equal(original.length, 1, `${file} owns one ${name} expression`)
  assert.equal(placements.length, 2, `Two generated ${name} placements`)

  for (const expression of placements) {
    assert.deepEqual(expression, original.at(0), `${name} AST stays unchanged`)
  }

  const changed = generated.replace(
    name === 'makeBinding'
      ? "field: 'messageComposer'"
      : name === 'makeUpdate'
        ? 'connection: () => ConnectionState.Connecting()'
        : 'RequestedDisconnect: disconnect',
    name === 'makeBinding'
      ? "field: 'missingComposer'"
      : name === 'makeUpdate'
        ? 'connection: () => ConnectionState.Disconnected()'
        : 'RequestedDisconnect: makeNoopStep()',
  )

  assert.notEqual(changed, generated, `${name} mutation found its target`)
  assert.notDeepEqual(
    expressions(changed, name),
    placements,
    `${name} gate detects a changed complete expression`,
  )
}

console.log(
  'Binding/update/inMessageUpdate AST equality and three deliberate mutation controls passed.',
)

const composerPlacements = read('src/composerPlacements.ts')
const originalReceive = expressions(
  read('src/messageComposer/inMessageUpdate.ts'),
  'makeInMessageUpdate',
)
const placedReceives = expressions(composerPlacements, 'makeInMessageUpdate')
assert.equal(originalReceive.length, 1)
assert.equal(placedReceives.length, 2)

for (const expression of placedReceives) {
  assert.deepEqual(
    expression,
    originalReceive.at(0),
    'Composer inMessageUpdate AST stays unchanged',
  )
}

const changedComposer = composerPlacements.replace(
  'RequestedSubmit: submitMessage',
  'RequestedSubmit: makeNoopStep()',
)
assert.notEqual(changedComposer, composerPlacements)
assert.notDeepEqual(
  expressions(changedComposer, 'makeInMessageUpdate'),
  placedReceives,
)
console.log(
  'Composer inMessageUpdate AST equality and its deliberate mutation control passed.',
)
