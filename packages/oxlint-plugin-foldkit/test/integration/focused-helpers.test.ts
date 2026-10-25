import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildPlugin } from './build-plugin.ts'
import { runOxlint } from './run-oxlint.ts'

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const oxlintBin = join(
  pluginRoot,
  '..',
  '..',
  'node_modules',
  'oxlint',
  'bin',
  'oxlint',
)
const workDir = mkdtempSync(join(tmpdir(), 'foldkit-focused-helper-lint-'))
const bundlePath = join(workDir, 'plugin.mjs')

beforeAll(async () => {
  await buildPlugin(bundlePath)
})

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

const diagnosticsFor = (name: string, rule: string, source: string) => {
  const sourcePath = join(workDir, `${name}.ts`)
  const configPath = join(workDir, `${name}.json`)
  writeFileSync(sourcePath, source)
  writeFileSync(
    configPath,
    JSON.stringify({
      plugins: ['typescript'],
      jsPlugins: [
        { name: 'foldkit', specifier: pathToFileURL(bundlePath).href },
      ],
      categories: { correctness: 'off' },
      rules: { [`foldkit/${rule}`]: 'error' },
    }),
  )
  const diagnostics = runOxlint({
    oxlintBin,
    cwd: workDir,
    configPath,
    target: sourcePath,
  })
  for (const diagnostic of diagnostics) {
    if (diagnostic.code !== `foldkit(${rule})`) {
      throw new Error(
        `Unexpected diagnostic ${diagnostic.code}: ${diagnostic.message}`,
      )
    }
  }
  return diagnostics
}

const parentSource = `
import { Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as Child from './child'
const Model = Schema.Struct({
  child: Child.Model,
  label: Schema.String,
  preferences: Schema.Struct({ theme: Schema.String }),
})
const Message = defineMessageUnion({ RequestedChange: { label: Schema.String } })
const ParentDefinition = Block.makeDefinition('Parent', { Model, Message })
const ChildBinding = ParentDefinition.makeBinding(Child.ChildBlock, { field: 'child' })
const ParentComposition = ParentDefinition.makeComposition({ bindings: [ChildBinding] })
`

const childTransform = `child => modifyFields(child, { theme: () => 'Light' })`

const directFieldsCases = [
  [
    'model-message-record',
    `
export const update = ParentComposition.makeUpdate({
  RequestedChange: ParentDefinition.makeFieldsStep((model, message) => ({ child: ${childTransform} })),
})`,
  ],
  [
    'payload-record',
    `
export const update = ParentComposition.makeUpdate({
  RequestedChange: ParentDefinition.makeFieldsStep.fromMessage(message => ({ child: ${childTransform} })),
})`,
  ],
  [
    'payload-applied',
    `
export const update = ParentComposition.makeUpdate({
  RequestedChange: (model, message) => ParentDefinition.makeFieldsStep.fromMessage(value => ({
    child: ${childTransform},
  }))(model, message),
})`,
  ],
  [
    'model-message-applied',
    `
const changeChild = ParentDefinition.makeFieldsStep((model, message) => ({ child: ${childTransform} }))
export const update = ParentComposition.makeUpdate({
  RequestedChange: (model, message) => changeChild(model, message),
})`,
  ],
  [
    'model-message-producer-body',
    `
export const update = ParentComposition.makeUpdate({
  RequestedChange: ParentDefinition.makeFieldsStep((model, message) => {
    const changed = modifyFields(model, { child: ${childTransform} })
    return { label: () => changed.label }
  }),
})`,
  ],
  [
    'payload-named-callback',
    `
function changeFields(message) {
  return { child: ${childTransform} }
}
const changeChild = ParentDefinition.makeFieldsStep.fromMessage(changeFields)
export const update = ParentComposition.makeUpdate({ RequestedChange: changeChild })`,
  ],
  [
    'model-message-extracted',
    `
const changeChild = ParentDefinition.makeFieldsStep((model, message) => ({ child: ${childTransform} }))
const changeAlias = changeChild
export const update = ParentComposition.makeUpdate({ RequestedChange: changeAlias })`,
  ],
  [
    'payload-extracted',
    `
const changeChild = ParentDefinition.makeFieldsStep.fromMessage(message => ({ child: Child.revealErrors }))
const cases = { RequestedChange: changeChild }
export const update = ParentComposition.makeUpdate(cases)`,
  ],
  [
    'payload-context',
    `
const makeCases = context => ({
  RequestedChange: ParentDefinition.makeFieldsStep.fromMessage(message => ({ child: ${childTransform} })),
})
export const update = ParentComposition.makeUpdate.withContext(makeCases)`,
  ],
  [
    'unary-combined',
    `
const changeChild = ParentDefinition.makeFieldsStep(() => ({ child: ${childTransform} }))
export const update = ParentComposition.makeUpdate({
  RequestedChange: (model, message) => Update.combineSteps(model, [changeChild, ChildBinding.requestChange()]),
})`,
  ],
] satisfies ReadonlyArray<readonly [string, string]>

describe('focused helper ownership through real oxlint', () => {
  for (const [name, source] of directFieldsCases) {
    it(`rejects child state transforms in ${name}`, () => {
      const diagnostics = diagnosticsFor(
        name,
        'no-direct-block-state-update',
        parentSource + source,
      )
      expect(diagnostics.map(diagnostic => diagnostic.code)).toEqual([
        'foldkit(no-direct-block-state-update)',
      ])
      expect(
        diagnostics.every(diagnostic => diagnostic.message.includes('`child`')),
      ).toBe(true)
    })
  }

  it('accepts parent-owned domain fields and foreign helper lookalikes', () => {
    const source =
      parentSource +
      `
const ForeignDefinition = {
  makeFieldsStep: Object.assign(callback => callback, { fromMessage: callback => callback }),
}
const foreignStep = ForeignDefinition.makeFieldsStep.fromMessage(message => ({ child: ${childTransform} }))
const rename = ParentDefinition.makeFieldsStep.fromMessage(message => ({
  label: () => message.label,
  preferences: preferences => modifyFields(preferences, { theme: () => message.label }),
}))
const otherModel = Schema.Struct({ child: Child.Model })
const OtherDefinition = Block.makeDefinition('Other', { Model: otherModel, Message })
const otherStep = OtherDefinition.makeFieldsStep.fromMessage(message => ({ child: ${childTransform} }))
export const update = ParentComposition.makeUpdate({
  RequestedChange: rename,
})
export const foreignUpdate = ParentComposition.makeUpdate({ RequestedChange: foreignStep })
export const unrelatedUpdate = ParentComposition.makeUpdate({ RequestedChange: otherStep })
`
    expect(
      diagnosticsFor(
        'parent-and-foreign-fields',
        'no-direct-block-state-update',
        source,
      ),
    ).toEqual([])
  })

  it('resolves the callback binding in its lexical scope', () => {
    const source =
      parentSource +
      `
const fields = message => ({ child: ${childTransform} })
const makeCases = context => {
  const fields = message => ({ label: () => message.label })
  return { RequestedChange: ParentDefinition.makeFieldsStep.fromMessage(fields) }
}
export const update = ParentComposition.makeUpdate.withContext(makeCases)
`
    expect(
      diagnosticsFor(
        'shadowed-fields-callback',
        'no-direct-block-state-update',
        source,
      ),
    ).toEqual([])
  })

  it('does not treat a payload parameter named model as the parent Model', () => {
    const source =
      parentSource +
      `
export const update = ParentComposition.makeUpdate({
  RequestedChange: ParentDefinition.makeFieldsStep.fromMessage(model => {
    const payload = modifyFields(model, { child: ${childTransform} })
    return { label: () => payload.label }
  }),
})
`
    expect(
      diagnosticsFor(
        'payload-model-name',
        'no-direct-block-state-update',
        source,
      ),
    ).toEqual([])
  })

  it('rejects child Messages in parent-owned payload-only Command helpers', () => {
    const source =
      parentSource +
      `
const Receive = ParentDefinition.makeCommand('Receive', {})
const childMessages = ParentDefinition.makeCommandsStep.fromMessage(message => [
  Receive({ message: Child.Message.ClickedSave() }),
])
export const update = ParentComposition.makeUpdate({ RequestedChange: childMessages })
`
    expect(
      diagnosticsFor(
        'parent-command-messages',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toHaveLength(1)
  })

  it('accepts the owning child Messages in payload-only Command helpers', () => {
    const source =
      parentSource +
      `
const ChildDefinition = Block.makeDefinition('Child', { Model: Child.Model, Message: Child.Message })
const Deliver = ChildDefinition.makeCommand('Deliver', {})
export const ownMessages = ChildDefinition.makeCommandsStep.fromMessage(message => [
  Deliver({ message: Child.Message.ClickedSave() }),
])
`
    expect(
      diagnosticsFor(
        'child-command-messages',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toEqual([])
  })

  it('tracks named producers passed to the owning Command helper', () => {
    const source =
      parentSource +
      `
const ChildDefinition = Block.makeDefinition('Child', { Model: Child.Model, Message: Child.Message })
const Deliver = ChildDefinition.makeCommand('Deliver', {})
const commands = message => [Deliver({ message: Child.Message.ClickedSave() })]
export const ownMessages = ChildDefinition.makeCommandsStep.fromMessage(commands)
`
    expect(
      diagnosticsFor(
        'named-child-command-producer',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toEqual([])
  })

  it('does not grant child ownership to a producer also used by the parent', () => {
    const source =
      parentSource +
      `
const ChildDefinition = Block.makeDefinition('Child', { Model: Child.Model, Message: Child.Message })
const Deliver = ChildDefinition.makeCommand('Deliver', {})
const commands = message => [Deliver({ message: Child.Message.ClickedSave() })]
export const parentMessages = ParentDefinition.makeCommandsStep.fromMessage(commands)
export const ownMessages = ChildDefinition.makeCommandsStep.fromMessage(commands)
`
    expect(
      diagnosticsFor(
        'shared-command-producer',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toHaveLength(1)
  })

  it('accepts Messages owned by an imported focused helper', () => {
    const source = `
import { ChildDefinition, Deliver, Message } from './child'
export const ownMessages = ChildDefinition.makeCommandsStep.fromMessage(message => [
  Deliver({ message: Message.ClickedSave() }),
])
`
    expect(
      diagnosticsFor(
        'imported-child-command-producer',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toEqual([])
  })

  it('does not grant Message ownership to foreign Command helper lookalikes', () => {
    const source =
      parentSource +
      `
const Foreign = { makeDefinition: () => ({
  makeCommandsStep: Object.assign(callback => callback, { fromMessage: callback => callback }),
}) }
const ChildDefinition = Foreign.makeDefinition('Child', { Model: Child.Model, Message: Child.Message })
export const messages = ChildDefinition.makeCommandsStep.fromMessage(message => [Child.Message.ClickedSave()])
`
    expect(
      diagnosticsFor(
        'foreign-command-messages',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toHaveLength(1)
  })
})
