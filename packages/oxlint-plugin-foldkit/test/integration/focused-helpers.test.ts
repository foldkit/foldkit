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

const diagnosticsForSplitFiles = (
  name: string,
  rule: string,
  source: string,
  definition: string,
) => {
  writeFileSync(join(workDir, `${name}-definition.ts`), definition)
  return diagnosticsFor(name, rule, source)
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
const changeChildStep = ParentDefinition.makeFieldsStep((model, message) => ({ child: ${childTransform} }))
export const update = ParentComposition.makeUpdate({
  RequestedChange: (model, message) => changeChildStep(model, message),
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
const changeChildStep = ParentDefinition.makeFieldsStep.fromMessage(changeFields)
export const update = ParentComposition.makeUpdate({ RequestedChange: changeChildStep })`,
  ],
  [
    'model-message-extracted',
    `
const changeChildStep = ParentDefinition.makeFieldsStep((model, message) => ({ child: ${childTransform} }))
const changeAliasStep = changeChildStep
export const update = ParentComposition.makeUpdate({ RequestedChange: changeAliasStep })`,
  ],
  [
    'payload-extracted',
    `
const changeChildStep = ParentDefinition.makeFieldsStep.fromMessage(message => ({ child: Child.revealErrors }))
const cases = { RequestedChange: changeChildStep }
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
const changeChildStep = ParentDefinition.makeFieldsStep(() => ({ child: ${childTransform} }))
export const update = ParentComposition.makeUpdate({
  RequestedChange: (model, message) => Update.combineSteps(model, [changeChildStep, ChildBinding.requestChange()]),
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
const renameStep = ParentDefinition.makeFieldsStep.fromMessage(message => ({
  label: () => message.label,
  preferences: preferences => modifyFields(preferences, { theme: () => message.label }),
}))
const otherModel = Schema.Struct({ child: Child.Model })
const OtherDefinition = Block.makeDefinition('Other', { Model: otherModel, Message })
const otherStep = OtherDefinition.makeFieldsStep.fromMessage(message => ({ child: ${childTransform} }))
export const update = ParentComposition.makeUpdate({
  RequestedChange: renameStep,
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
const childMessagesStep = ParentDefinition.makeCommandsStep.fromMessage(message => [
  Receive({ message: Child.Message.ClickedSave() }),
])
export const update = ParentComposition.makeUpdate({ RequestedChange: childMessagesStep })
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
export const ownMessagesStep = ChildDefinition.makeCommandsStep.fromMessage(message => [
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
export const ownMessagesStep = ChildDefinition.makeCommandsStep.fromMessage(commands)
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
export const parentMessagesStep = ParentDefinition.makeCommandsStep.fromMessage(commands)
export const ownMessagesStep = ChildDefinition.makeCommandsStep.fromMessage(commands)
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
export const ownMessagesStep = ChildDefinition.makeCommandsStep.fromMessage(message => [
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

  it('rejects child state transforms through an aliased imported fields helper', () => {
    const definition = `
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Child from './child'
export const Model = Schema.Struct({ child: Child.Model })
export const Message = defineMessageUnion({ RequestedChange: {} })
export const ParentDefinition = Block.makeDefinition('Parent', { Model, Message })
export const { makeFieldsStep } = ParentDefinition
`
    const source = `
import { modifyFields } from 'foldkit/struct'
import * as Child from './child'
import { ParentDefinition, makeFieldsStep as fieldsStep } from './imported-fields-definition'
const ChildBinding = ParentDefinition.makeBinding(Child.ChildBlock, { field: 'child' })
const ParentComposition = ParentDefinition.makeComposition({ bindings: [ChildBinding] })
const changeFields = message => ({
  child: child => modifyFields(child, { theme: () => 'Light' }),
})
const fieldsFromMessage = fieldsStep.fromMessage
const changeChildStep = fieldsFromMessage(changeFields)
export const update = ParentComposition.makeUpdate({ RequestedChange: changeChildStep })
`

    expect(
      diagnosticsForSplitFiles(
        'imported-fields',
        'no-direct-block-state-update',
        source,
        definition,
      ),
    ).toHaveLength(1)
  })

  it('rejects child state transforms through a locally destructured fields helper', () => {
    const source =
      parentSource +
      `
const { makeFieldsStep } = ParentDefinition
const changeFields = message => ({ child: ${childTransform} })
const changeChildStep = makeFieldsStep.fromMessage(changeFields)
export const update = ParentComposition.makeUpdate({ RequestedChange: changeChildStep })
`

    expect(
      diagnosticsFor(
        'local-destructured-fields',
        'no-direct-block-state-update',
        source,
      ),
    ).toHaveLength(1)
  })

  it('rejects child state transforms through Definition member aliases', () => {
    const source =
      parentSource +
      `
const fieldsStep = ParentDefinition.makeFieldsStep
const fieldsFromMessage = ParentDefinition.makeFieldsStep.fromMessage
const changeFields = message => ({ child: ${childTransform} })
export const updateThroughHelper = ParentComposition.makeUpdate({
  RequestedChange: fieldsStep.fromMessage(changeFields),
})
export const updateThroughAdapter = ParentComposition.makeUpdate({
  RequestedChange: fieldsFromMessage(changeFields),
})
`

    expect(
      diagnosticsFor(
        'definition-member-fields-aliases',
        'no-direct-block-state-update',
        source,
      ),
    ).toHaveLength(2)
  })

  it('does not treat a fields adapter alias payload as the parent Model', () => {
    const source =
      parentSource.replace(
        'const Message = defineMessageUnion({ RequestedChange: { label: Schema.String } })',
        `const PayloadChild = Schema.Struct({ theme: Schema.String })
const Message = defineMessageUnion({
  RequestedChange: { child: PayloadChild, label: Schema.String },
})`,
      ) +
      `
const fieldsFromMessage = ParentDefinition.makeFieldsStep.fromMessage
const adapterAlias = fieldsFromMessage
const changeChildStep = adapterAlias(message => {
  const changedMessage = modifyFields(message, { child: ${childTransform} })
  return {
    label: () => changedMessage.label,
    preferences: () => message.child,
  }
})
export const update = ParentComposition.makeUpdate({ RequestedChange: changeChildStep })
`

    expect(
      diagnosticsFor(
        'fields-adapter-payload-overlap',
        'no-direct-block-state-update',
        source,
      ),
    ).toEqual([])
  })

  it('retains parent Model evidence through an ordinary fields helper alias', () => {
    const source =
      parentSource +
      `
const fieldsStep = ParentDefinition.makeFieldsStep
const changeChildStep = fieldsStep(model => {
  const changedModel = modifyFields(model, { child: ${childTransform} })
  return { label: () => changedModel.label }
})
export const update = ParentComposition.makeUpdate({ RequestedChange: changeChildStep })
`

    expect(
      diagnosticsFor(
        'fields-helper-model-evidence',
        'no-direct-block-state-update',
        source,
      ),
    ).toHaveLength(1)
  })

  it('keeps aliased fields helpers associated with their actual Definition', () => {
    const source =
      parentSource +
      `
const OtherDefinition = Block.makeDefinition('Other', { Model, Message })
const fieldsFromMessage = OtherDefinition.makeFieldsStep.fromMessage
const changeFields = message => ({ child: ${childTransform} })
export const update = ParentComposition.makeUpdate({
  RequestedChange: fieldsFromMessage(changeFields),
})
`

    expect(
      diagnosticsFor(
        'wrong-definition-fields-alias',
        'no-direct-block-state-update',
        source,
      ),
    ).toEqual([])
  })

  it('does not grant ownership to fields member aliases on lookalike objects', () => {
    const source =
      parentSource +
      `
const independent = {
  makeFieldsStep: Object.assign(callback => callback, { fromMessage: callback => callback }),
}
const fieldsFromMessage = independent.makeFieldsStep.fromMessage
const changeFields = message => ({ child: ${childTransform} })
export const update = ParentComposition.makeUpdate({
  RequestedChange: fieldsFromMessage(changeFields),
})
`

    expect(
      diagnosticsFor(
        'lookalike-fields-member-alias',
        'no-direct-block-state-update',
        source,
      ),
    ).toEqual([])
  })

  it('keeps imported fields helpers associated with their actual Definition', () => {
    const definition = `
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Child from './child'
export const Model = Schema.Struct({ child: Child.Model })
export const Message = defineMessageUnion({ RequestedChange: {} })
export const ParentDefinition = Block.makeDefinition('Parent', { Model, Message })
const OtherDefinition = Block.makeDefinition('Other', { Model, Message })
export const { makeFieldsStep } = OtherDefinition
`
    const source = `
import { modifyFields } from 'foldkit/struct'
import * as Child from './child'
import { ParentDefinition, makeFieldsStep } from './wrong-fields-definition'
const ChildBinding = ParentDefinition.makeBinding(Child.ChildBlock, { field: 'child' })
const ParentComposition = ParentDefinition.makeComposition({ bindings: [ChildBinding] })
const changeChildStep = makeFieldsStep(() => ({
  child: child => modifyFields(child, { theme: () => 'Light' }),
}))
export const update = ParentComposition.makeUpdate({ RequestedChange: changeChildStep })
`

    expect(
      diagnosticsForSplitFiles(
        'wrong-fields',
        'no-direct-block-state-update',
        source,
        definition,
      ),
    ).toEqual([])
  })

  it('does not infer fields helper ownership from a shadowed name', () => {
    const definition = `
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
export const Model = Schema.Struct({ label: Schema.String })
export const Message = defineMessageUnion({ RequestedChange: {} })
export const ParentDefinition = Block.makeDefinition('Parent', { Model, Message })
export const { makeFieldsStep } = ParentDefinition
`
    const source = `
import { makeFieldsStep as importedFieldsStep } from './shadowed-fields-definition'
const run = makeFieldsStep => makeFieldsStep(() => ({ child: child => child }))
export const step = run(callback => callback)
void importedFieldsStep
`

    expect(
      diagnosticsForSplitFiles(
        'shadowed-fields',
        'no-direct-block-state-update',
        source,
        definition,
      ),
    ).toEqual([])
  })

  it('tracks named producers passed to an aliased imported Command helper', () => {
    const definition = `
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
export const Model = Schema.Struct({ value: Schema.String })
export const Message = defineMessageUnion({ ClickedSave: {} })
export const ChildDefinition = Block.makeDefinition('Child', { Model, Message })
export const { makeCommandsStep } = ChildDefinition
`
    const source = `
import { Message, makeCommandsStep as commandsStep } from './imported-commands-definition'
const commands = message => [Message.ClickedSave()]
const commandsFromMessage = commandsStep.fromMessage
export const ownMessagesStep = commandsFromMessage(commands)
`

    expect(
      diagnosticsForSplitFiles(
        'imported-commands',
        'no-child-message-construction-in-root',
        source,
        definition,
      ),
    ).toEqual([])
  })

  it('tracks named producers passed to a locally destructured Command helper', () => {
    const source =
      parentSource +
      `
const ChildDefinition = Block.makeDefinition('Child', { Model: Child.Model, Message: Child.Message })
const { makeCommandsStep } = ChildDefinition
const commands = message => [Child.Message.ClickedSave()]
export const ownMessagesStep = makeCommandsStep.fromMessage(commands)
`

    expect(
      diagnosticsFor(
        'local-destructured-commands',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toEqual([])
  })

  it('tracks named producers through Definition Command member aliases', () => {
    const source =
      parentSource +
      `
const ChildDefinition = Block.makeDefinition('Child', { Model: Child.Model, Message: Child.Message })
const commandsStep = ChildDefinition.makeCommandsStep
const commandsFromMessage = ChildDefinition.makeCommandsStep.fromMessage
const commands = message => [Child.Message.ClickedSave()]
export const helperStep = commandsStep.fromMessage(commands)
export const adapterStep = commandsFromMessage(commands)
`

    expect(
      diagnosticsFor(
        'definition-member-command-aliases',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toEqual([])
  })

  it('tracks named producers passed to an imported general Step helper', () => {
    const definition = `
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
export const Model = Schema.Struct({ value: Schema.String })
export const Message = defineMessageUnion({ ClickedSave: {} })
export const ChildDefinition = Block.makeDefinition('Child', { Model, Message })
export const { makeStep } = ChildDefinition
`
    const source = `
import { Message, makeStep } from './imported-step-definition'
const save = model => ({ model, commands: [Message.ClickedSave()] })
export const saveStep = makeStep(save)
`

    expect(
      diagnosticsForSplitFiles(
        'imported-step',
        'no-child-message-construction-in-root',
        source,
        definition,
      ),
    ).toEqual([])
  })

  it('tracks named producers through a Definition general Step member alias', () => {
    const source =
      parentSource +
      `
const ChildDefinition = Block.makeDefinition('Child', { Model: Child.Model, Message: Child.Message })
const step = ChildDefinition.makeStep
const save = model => ({ model, commands: [Child.Message.ClickedSave()] })
export const ownMessagesStep = step(save)
`

    expect(
      diagnosticsFor(
        'definition-member-general-step-alias',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toEqual([])
  })

  it('rejects child Messages passed to an imported parent Command helper', () => {
    const definition = `
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
export const Model = Schema.Struct({ value: Schema.String })
export const Message = defineMessageUnion({ CompletedWork: {} })
export const ParentDefinition = Block.makeDefinition('Parent', { Model, Message })
export const { makeCommandsStep } = ParentDefinition
`
    const source = `
import * as Child from './child'
import { makeCommandsStep } from './parent-commands-definition'
const commands = message => [Child.Message.ClickedSave()]
export const childMessagesStep = makeCommandsStep.fromMessage(commands)
`

    expect(
      diagnosticsForSplitFiles(
        'parent-commands',
        'no-child-message-construction-in-root',
        source,
        definition,
      ),
    ).toHaveLength(1)
  })

  it('rejects child Messages behind a shadowed Command helper name', () => {
    const definition = `
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
export const Model = Schema.Struct({ value: Schema.String })
export const Message = defineMessageUnion({ CompletedWork: {} })
export const ParentDefinition = Block.makeDefinition('Parent', { Model, Message })
export const { makeCommandsStep } = ParentDefinition
`
    const source = `
import * as Child from './child'
import { makeCommandsStep as importedCommandsStep } from './shadowed-commands-definition'
const make = makeCommandsStep => makeCommandsStep(() => [Child.Message.ClickedSave()])
export const step = make(callback => callback)
void importedCommandsStep
`

    expect(
      diagnosticsForSplitFiles(
        'shadowed-commands',
        'no-child-message-construction-in-root',
        source,
        definition,
      ),
    ).toHaveLength(1)
  })
})
