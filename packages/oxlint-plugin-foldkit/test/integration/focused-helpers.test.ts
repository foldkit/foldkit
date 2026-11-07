import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
const ChildBinding = ParentDefinition.makeRequiredFieldBinding(Child.ChildBlock, { field: 'child' })
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
const changeForeignChild = ForeignDefinition.makeFieldsStep.fromMessage(message => ({ child: ${childTransform} }))
const renameChild = ParentDefinition.makeFieldsStep.fromMessage(message => ({
  label: () => message.label,
  preferences: preferences => modifyFields(preferences, { theme: () => message.label }),
}))
const otherModel = Schema.Struct({ child: Child.Model })
const OtherDefinition = Block.makeDefinition('Other', { Model: otherModel, Message })
const changeOtherChild = OtherDefinition.makeFieldsStep.fromMessage(message => ({ child: ${childTransform} }))
export const update = ParentComposition.makeUpdate({
  RequestedChange: renameChild,
})
export const foreignUpdate = ParentComposition.makeUpdate({ RequestedChange: changeForeignChild })
export const unrelatedUpdate = ParentComposition.makeUpdate({ RequestedChange: changeOtherChild })
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
const produceChildMessages = ParentDefinition.makeCommandsStep.fromMessage(message => [
  Receive({ message: Child.Message.ClickedSave() }),
])
export const update = ParentComposition.makeUpdate({ RequestedChange: produceChildMessages })
`
    expect(
      diagnosticsFor(
        'parent-command-messages',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toHaveLength(1)
  })

  it('rejects child Messages in parent-owned general Message-only Step producers', () => {
    const source =
      parentSource +
      `
const Receive = ParentDefinition.makeCommand('Receive', {})
export const produceMessages = ParentDefinition.makeStep.fromMessage(message =>
  ParentDefinition.makeCommandsStep(() => [Receive({ message: Child.Message.ClickedSave() })]),
)
`
    expect(
      diagnosticsFor(
        'parent-general-messages',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toHaveLength(1)
  })

  it('recognizes the owning Definition through an imported general Message-only Step helper', () => {
    const definition = `
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
export const Model = Schema.Struct({ count: Schema.Number })
export const Message = defineMessageUnion({ ClickedSave: {} })
export const ChildDefinition = Block.makeDefinition('Child', { Model, Message })
export const { makeStep } = ChildDefinition
`
    const source = `
import { Message, makeStep } from './general-message-owner-definition'
const produceSave = message => model => ({ model, commands: [Message.ClickedSave()] })
export const produceOwnMessages = makeStep.fromMessage(produceSave)
`
    expect(
      diagnosticsForSplitFiles(
        'general-message-owner',
        'no-child-message-construction-in-root',
        source,
        definition,
      ),
    ).toEqual([])
  })

  it('does not grant Message ownership to a general Step helper lookalike', () => {
    const source =
      parentSource +
      `
const Foreign = { makeDefinition: () => ({
  makeStep: Object.assign(callback => callback, { fromMessage: callback => callback }),
}) }
const ChildDefinition = Foreign.makeDefinition('Child', { Model: Child.Model, Message: Child.Message })
export const produceMessages = ChildDefinition.makeStep.fromMessage(message => [Child.Message.ClickedSave()])
`
    expect(
      diagnosticsFor(
        'foreign-general-messages',
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
export const produceOwnMessages = ChildDefinition.makeCommandsStep.fromMessage(message => [
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
export const produceOwnMessages = ChildDefinition.makeCommandsStep.fromMessage(commands)
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
export const produceParentMessages = ParentDefinition.makeCommandsStep.fromMessage(commands)
export const produceOwnMessages = ChildDefinition.makeCommandsStep.fromMessage(commands)
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
export const produceOwnMessages = ChildDefinition.makeCommandsStep.fromMessage(message => [
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
const ChildBinding = ParentDefinition.makeRequiredFieldBinding(Child.ChildBlock, { field: 'child' })
const ParentComposition = ParentDefinition.makeComposition({ bindings: [ChildBinding] })
const changeFields = message => ({
  child: child => modifyFields(child, { theme: () => 'Light' }),
})
const fieldsFromMessage = fieldsStep.fromMessage
const changeChild = fieldsFromMessage(changeFields)
export const update = ParentComposition.makeUpdate({ RequestedChange: changeChild })
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
const changeChild = makeFieldsStep.fromMessage(changeFields)
export const update = ParentComposition.makeUpdate({ RequestedChange: changeChild })
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
const changeChild = adapterAlias(message => {
  const changedMessage = modifyFields(message, { child: ${childTransform} })
  return {
    label: () => changedMessage.label,
    preferences: () => message.child,
  }
})
export const update = ParentComposition.makeUpdate({ RequestedChange: changeChild })
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
const changeChild = fieldsStep(model => {
  const changedModel = modifyFields(model, { child: ${childTransform} })
  return { label: () => changedModel.label }
})
export const update = ParentComposition.makeUpdate({ RequestedChange: changeChild })
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
const ChildBinding = ParentDefinition.makeRequiredFieldBinding(Child.ChildBlock, { field: 'child' })
const ParentComposition = ParentDefinition.makeComposition({ bindings: [ChildBinding] })
const changeChild = makeFieldsStep(() => ({
  child: child => modifyFields(child, { theme: () => 'Light' }),
}))
export const update = ParentComposition.makeUpdate({ RequestedChange: changeChild })
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
export const produceOwnMessages = commandsFromMessage(commands)
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
export const produceOwnMessages = makeCommandsStep.fromMessage(commands)
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
export const produceCommands = commandsStep.fromMessage(commands)
export const produceAdaptedCommands = commandsFromMessage(commands)
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
export const saveChanges = makeStep(save)
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
export const produceOwnMessages = step(save)
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
export const produceChildMessages = makeCommandsStep.fromMessage(commands)
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

describe('InMessage update handler ownership through real oxlint', () => {
  const inMessageUpdateCases = [
    [
      'inline',
      `ParentComposition.makeInMessageUpdate({ RequestedChange: model => ({ model: modifyFields(model, { child: ${childTransform} }) }) })`,
    ],
    [
      'named-record',
      `const handleRequest = model => ({ model: modifyFields(model, { child: ${childTransform} }) })
const inMessageUpdateCases = { RequestedChange: handleRequest }
ParentComposition.makeInMessageUpdate(inMessageUpdateCases)`,
    ],
    [
      'contextual',
      `const makeCases = context => ({ RequestedChange: model => ({ model: modifyFields(model, { child: ${childTransform} }) }) })
ParentComposition.makeInMessageUpdate.withContext(makeCases)`,
    ],
    [
      'fields-helper',
      `ParentComposition.makeInMessageUpdate({ RequestedChange: ParentDefinition.makeFieldsStep.fromMessage(input => ({ child: ${childTransform} })) })`,
    ],
  ] satisfies ReadonlyArray<readonly [string, string]>

  for (const [name, source] of inMessageUpdateCases) {
    it(`rejects direct child Model changes in ${name} inMessageUpdate handlers`, () => {
      expect(
        diagnosticsFor(
          `inMessageUpdate-state-${name}`,
          'no-direct-block-state-update',
          parentSource + source,
        ),
      ).toHaveLength(1)
    })
  }

  it('accepts bound operations, parent fields, and payload fields without attributing them to the child Model', () => {
    const source =
      parentSource +
      `
const renameParent = ParentDefinition.makeFieldsStep.fromMessage(input => ({ label: () => input.label }))
ParentComposition.makeInMessageUpdate({ RequestedChange: ChildBinding.requestChange() })
ParentComposition.makeInMessageUpdate.withContext(context => ({ RequestedChange: renameParent }))
ParentComposition.makeInMessageUpdate({ RequestedChange: (model, input) => {
  const changedInput = modifyFields(input, { child: ${childTransform} })
  return { model: modifyFields(model, { label: () => changedInput.label }) }
} })
const unrelated = { makeInMessageUpdate: handlers => handlers }
unrelated.makeInMessageUpdate({ RequestedChange: model => ({ model: modifyFields(model, { child: ${childTransform} }) }) })
`
    expect(
      diagnosticsFor(
        'receive-parent-fields',
        'no-direct-block-state-update',
        source,
      ),
    ).toEqual([])
  })

  for (const method of [
    'makeInMessageUpdate',
    'makeInMessageUpdate.withContext',
  ]) {
    it(`retains parent Message ownership in ${method}`, () => {
      const handlers = `{ RequestedChange: model => {
  Child.Message.ClickedSave()
  return { model }
} }`
      const argument = method.endsWith('withContext')
        ? `context => (${handlers})`
        : handlers
      expect(
        diagnosticsFor(
          `inMessageUpdate-message-parent-${method}`,
          'no-child-message-construction-in-root',
          parentSource + `ParentComposition.${method}(${argument})`,
        ),
      ).toHaveLength(1)
    })

    it(`allows the child's own local Message in ${method}`, () => {
      const handlers = `{ RequestedChange: handleRequest }`
      const argument = method.endsWith('withContext')
        ? `context => (${handlers})`
        : handlers
      const source =
        parentSource +
        `
const ChildDefinition = Block.makeDefinition('Child', { Model: Child.Model, Message: Child.Message })
const ChildComposition = ChildDefinition.makeComposition()
const handleRequest = model => {
  Child.Message.ClickedSave()
  return { model }
}
ChildComposition.${method}(${argument})
`
      expect(
        diagnosticsFor(
          `inMessageUpdate-message-child-${method}`,
          'no-child-message-construction-in-root',
          source,
        ),
      ).toEqual([])
    })

    it(`keeps ${method} pure inside an effectful Block constructor`, () => {
      const handlers = `{ RequestedChange: model => ({ model, commands: [Save({ timestamp: Date.now() })] }) }`
      const argument = method.endsWith('withContext')
        ? `context => (${handlers})`
        : handlers
      const source =
        parentSource +
        `
import { Effect } from 'effect'
const Save = ParentDefinition.makeCommand('Save', {})
export const construct = Effect.gen(function* () {
  return { inMessageUpdate: ParentComposition.${method}(${argument}) }
})


`
      expect(
        diagnosticsFor(
          `inMessageUpdate-purity-${method}`,
          'no-impure-call-at-decision-time',
          source,
        ),
      ).toHaveLength(1)
    })
  }

  for (const method of [
    'makeInMessageUpdate',
    'makeInMessageUpdate.withContext',
  ]) {
    it(`keeps extracted ${method} callbacks pure while actual Command handler execution stays deferred`, () => {
      const argument = method.endsWith('withContext') ? 'makeCases' : 'cases'
      const source =
        parentSource +
        `
import { Effect } from 'effect'
export const construct = Effect.gen(function* () {
  const Save = ParentDefinition.makeCommand('Save', {
    handler: function* () { return () => Effect.sync(() => Date.now()) },
  })
  const handleRequest = model => ({ model, commands: [Save({ timestamp: Date.now() })] })
  const cases = { RequestedChange: handleRequest }
  const makeCases = context => cases
  return { inMessageUpdate: ParentComposition.${method}(${argument}) }
})
`
      expect(
        diagnosticsFor(
          `inMessageUpdate-extracted-purity-${method}`,
          'no-impure-call-at-decision-time',
          source,
        ),
      ).toHaveLength(1)
    })
  }

  it('retains deferred Effect execution and constructor-time effects without treating lookalike receivers as pure boundaries', () => {
    const source =
      parentSource +
      `
import { Effect } from 'effect'
export const construct = Effect.gen(function* () {
  const constructedAt = Date.now()
  const Foreign = { makeInMessageUpdate: cases => cases }
  Foreign.makeInMessageUpdate({ RequestedChange: model => ({ model, constructedAt: Date.now() }) })
  const Save = ParentDefinition.makeCommand('Save', {
    handler: function* () { return () => Effect.sync(() => Date.now()) },
  })
  return {
    inMessageUpdate: ParentComposition.makeInMessageUpdate({ RequestedChange: model => ({
      model,
      commands: [Save({ timestamp: Effect.sync(() => Date.now()) })],
    }) }),
  }
})
`
    expect(
      diagnosticsFor(
        'receive-deferred-effects',
        'no-impure-call-at-decision-time',
        source,
      ),
    ).toEqual([])
  })

  it('does not give a lookalike receiver ownership of child Messages or reject input construction', () => {
    const source =
      parentSource +
      `
const Foreign = { makeInMessageUpdate: Object.assign(cases => cases, { withContext: createCases => createCases }) }
const ChildDefinition = Foreign
const handleRequest = model => {
  Child.Message.ClickedSave()
  Child.InMessage.RequestedSave()
  return { model }
}
ChildDefinition.makeInMessageUpdate.withContext(() => ({ RequestedChange: handleRequest }))
`
    expect(
      diagnosticsFor(
        'receive-lookalike-message-owner',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toHaveLength(1)
  })
})

describe('test Command result authorship through real oxlint', () => {
  const imports = [
    [
      'story-namespace',
      "import * as Story from 'foldkit/story'",
      'Story.Command',
    ],
    [
      'story-named',
      "import { Command as PendingCommand } from 'foldkit/story'",
      'PendingCommand',
    ],
    [
      'scene-root',
      "import { Scene as TestScene } from 'foldkit'",
      'TestScene.Command',
    ],
    [
      'scene-namespace',
      "import * as Scene from 'foldkit/scene'",
      'Scene.Command',
    ],
  ] satisfies ReadonlyArray<readonly [string, string, string]>

  for (const [name, imported, command] of imports) {
    for (const method of ['resolve', 'resolveAll', 'resolveAllExact']) {
      it(`accepts result Messages in ${name} ${method}`, () => {
        const result = 'Child.Message.CompletedFetch({ value: 1 })'
        const args =
          method === 'resolve'
            ? `Child.Fetch, ${result}`
            : `[Child.Fetch, ${result}]`
        const source = `
${imported}
import * as Child from './child'
export const completion = ${command}.${method}(${args})
`
        expect(
          diagnosticsFor(
            `test-result-${name}-${method}`,
            'no-child-message-construction-in-root',
            source,
          ),
        ).toEqual([])
      })
    }
  }

  it('accepts the actual standalone Query input-testing snippet', () => {
    const source = readFileSync(
      join(
        pluginRoot,
        '..',
        'website',
        'src',
        'snippet',
        'queryInputTesting.ts',
      ),
      'utf8',
    )
    expect(
      diagnosticsFor(
        'query-input-testing',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toEqual([])
  })

  it('accepts immutable resolver aliases without granting ownership to other test steps', () => {
    const source = `
import * as Story from 'foldkit/story'
import * as Child from './child'
const resolveCommand = Story.Command.resolve
const completion = resolveCommand(Child.Fetch, Child.Message.CompletedFetch())
export const fixture = Story.story(Child.Block, Story.init(), completion)
Story.message(Child.Message.ClickedSave())
`
    expect(
      diagnosticsFor(
        'test-result-alias',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toHaveLength(1)
  })

  it('rejects child construction in matcher positions', () => {
    const source = `
import * as Story from 'foldkit/story'
import * as Child from './child'
Story.Command.resolve(Child.Message.ClickedSave(), {})
Story.Command.resolveAll([Child.Message.ClickedSave(), {}])
Story.Command.resolveAllExact([Child.Message.ClickedSave(), {}])
`
    expect(
      diagnosticsFor(
        'test-result-matcher',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toHaveLength(3)
  })

  it('rejects spoofed and shadowed resolver APIs', () => {
    const source = `
import * as ImportedStory from 'foldkit/story'
import * as Child from './child'
const Story = { Command: { resolve: (matcher, result) => result } }
Story.Command.resolve(Child.Fetch, Child.Message.CompletedFetch())
const resolve = ImportedStory => ImportedStory.Command.resolve(Child.Fetch, Child.Message.CompletedFetch())
void resolve
`
    expect(
      diagnosticsFor(
        'test-result-spoof',
        'no-child-message-construction-in-root',
        source,
      ),
    ).toHaveLength(2)
  })

  for (const method of ['makeUpdate', 'makeInMessageUpdate']) {
    it(`rejects resolver arguments inside parent ${method} handlers`, () => {
      const source =
        parentSource +
        `
import * as Story from 'foldkit/story'
ParentComposition.${method}({ RequestedChange: model => {
  const completion = Story.Command.resolve(Child.Fetch, Child.Message.CompletedFetch())
  return { model, completion }
} })
`
      expect(
        diagnosticsFor(
          `test-result-parent-${method}`,
          'no-child-message-construction-in-root',
          source,
        ),
      ).toHaveLength(1)
    })
  }
})

describe('composed update handler ownership through real oxlint', () => {
  const forms = [
    'record',
    'withContext',
    'cases',
    'contextCases',
    'each',
    'on',
    'except',
  ]
  const author = (builder: string, form: string, handler: string): string => {
    if (form === 'record') {
      return `${builder}({ RequestedChange: ${handler} })`
    }
    if (form === 'withContext') {
      return `${builder}.withContext(context => ({ RequestedChange: ${handler} }))`
    }
    if (form === 'cases') {
      return `${builder}.cases({ RequestedChange: ${handler} })`
    }
    if (form === 'contextCases') {
      return `${builder}.cases.withContext(context => ({ RequestedChange: ${handler} }))`
    }
    if (form === 'each') {
      return `${builder}.each(${handler})`
    }
    if (form === 'on') {
      return `${builder}.on(['RequestedChange'])(${handler})`
    }
    return `${builder}.except([])(${handler})`
  }
  const alias = (builder: string, form: string): string => {
    if (form === 'record') {
      return `const focused = ${builder}`
    }
    if (form === 'withContext') {
      return `const { withContext: focused } = ${builder}`
    }
    if (form === 'cases') {
      return `const { cases: focused } = ${builder}`
    }
    if (form === 'contextCases') {
      return `const { withContext: focused } = ${builder}.cases`
    }
    if (form === 'each') {
      return `const { each: focused } = ${builder}`
    }
    if (form === 'on') {
      return `const { on: select } = ${builder}; const focused = select(['RequestedChange'])`
    }
    return `const { except: select } = ${builder}; const focused = select([])`
  }
  const applyAlias = (form: string, handler: string): string => {
    if (form === 'record' || form === 'cases') {
      return `focused({ RequestedChange: ${handler} })`
    }
    if (form === 'withContext' || form === 'contextCases') {
      return `focused(context => ({ RequestedChange: ${handler} }))`
    }
    return `focused(${handler})`
  }

  for (const method of ['makeUpdate', 'makeInMessageUpdate']) {
    for (const form of forms) {
      it(`checks child Model ownership in inline and extracted ${method}.${form}`, () => {
        const handler = `model => ({ model: modifyFields(model, { child: ${childTransform} }) })`
        const source =
          parentSource +
          `
const { ${method}: authorUpdate } = ParentComposition
${alias('authorUpdate', form)}
const changeChild = ${handler}
${author(`ParentComposition.${method}`, form, handler)}
${applyAlias(form, 'changeChild')}
`
        expect(
          diagnosticsFor(
            `composed-fields-${method}-${form}`,
            'no-direct-block-state-update',
            source,
          ),
        ).toHaveLength(2)
      })

      it(`keeps inline and extracted ${method}.${form} callbacks pure in constructors`, () => {
        const handler = `model => ({ model, constructedAt: Date.now() })`
        const source =
          parentSource +
          `
import { Effect } from 'effect'
export const construct = Effect.gen(function* () {
  const { ${method}: authorUpdate } = ParentComposition
  ${alias('authorUpdate', form)}
  const changeParent = ${handler}
  return [${author(`ParentComposition.${method}`, form, handler)}, ${applyAlias(form, 'changeParent')}]
})
`
        expect(
          diagnosticsFor(
            `composed-pure-${method}-${form}`,
            'no-impure-call-at-decision-time',
            source,
          ),
        ).toHaveLength(2)
      })

      it(`allows local Messages in inline and extracted owned ${method}.${form}`, () => {
        const handler = `model => { Child.Message.ClickedSave(); return { model } }`
        const source =
          parentSource +
          `
const ChildDefinition = Block.makeDefinition('Child', { Model: Child.Model, Message: Child.Message })
const ChildComposition = ChildDefinition.makeComposition()
const { ${method}: authorUpdate } = ChildComposition
${alias('authorUpdate', form)}
const changeChild = ${handler}
${author(`ChildComposition.${method}`, form, handler)}
${applyAlias(form, 'changeChild')}
`
        expect(
          diagnosticsFor(
            `composed-local-message-${method}-${form}`,
            'no-child-message-construction-in-root',
            source,
          ),
        ).toEqual([])
      })

      it(`rejects foreign Messages in inline and extracted parent ${method}.${form}`, () => {
        const handler = `model => { Child.Message.ClickedSave(); return { model } }`
        const source =
          parentSource +
          `
const { ${method}: authorUpdate } = ParentComposition
${alias('authorUpdate', form)}
const changeParent = ${handler}
${author(`ParentComposition.${method}`, form, handler)}
${applyAlias(form, 'changeParent')}
`
        expect(
          diagnosticsFor(
            `composed-foreign-message-${method}-${form}`,
            'no-child-message-construction-in-root',
            source,
          ),
        ).toHaveLength(2)
      })
    }

    it(`retains owner-bound focused Step helper aliases in ${method} pieces`, () => {
      const source =
        parentSource +
        `
const { makeFieldsStep: fields } = ParentDefinition
const changeChild = fields(() => ({ child: ${childTransform} }))
const { ${method}: authorUpdate } = ParentComposition
const applyCases = authorUpdate.cases
applyCases({ RequestedChange: changeChild })
`
      expect(
        diagnosticsFor(
          `composed-step-alias-${method}`,
          'no-direct-block-state-update',
          source,
        ),
      ).toHaveLength(1)
    })

    it(`retains imported Definition ownership through focused ${method} aliases`, () => {
      const name = `composed-imported-${method}`
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
import { ParentDefinition, makeFieldsStep as fields } from './${name}-definition'
const ChildBinding = ParentDefinition.makeRequiredFieldBinding(Child.ChildBlock, { field: 'child' })
const ParentComposition = ParentDefinition.makeComposition({ bindings: [ChildBinding] })
const changeChild = fields.fromMessage(input => ({ child: ${childTransform} }))
const { ${method}: authorUpdate } = ParentComposition
const { cases: selected } = authorUpdate
selected.withContext(context => ({ RequestedChange: changeChild }))
`
      expect(
        diagnosticsForSplitFiles(
          name,
          'no-direct-block-state-update',
          source,
          definition,
        ),
      ).toHaveLength(1)
    })

    it(`does not authenticate an unrelated package's Composition for ${method}`, () => {
      const source = `
import { Effect } from 'effect'
import { ForeignDefinition } from 'foreign-block-library'
import * as Child from './child'
import { modifyFields } from 'foldkit/struct'
const ForeignComposition = ForeignDefinition.makeComposition()
export const construct = Effect.gen(function* () {
  return ForeignComposition.${method}.each(model => ({ model: modifyFields(model, { child: ${childTransform} }), timestamp: Date.now() }))
})
`
      expect(
        diagnosticsFor(
          `composed-package-fields-${method}`,
          'no-direct-block-state-update',
          source,
        ),
      ).toEqual([])
      expect(
        diagnosticsFor(
          `composed-package-pure-${method}`,
          'no-impure-call-at-decision-time',
          source,
        ),
      ).toEqual([])
    })

    for (const form of ['cases', 'contextCases', 'each', 'on', 'except']) {
      it(`ignores spoofed and shadowed ${method}.${form} for child state and purity`, () => {
        const handler = `model => ({ model: modifyFields(model, { child: ${childTransform} }), constructedAt: Date.now() })`
        const source =
          parentSource +
          `
import { Effect } from 'effect'
export const construct = Effect.gen(function* () {
  const Foreign = { ${method}: Object.assign(value => value, { cases: Object.assign(value => value, { withContext: value => value }), each: value => value, on: tags => value => value, except: tags => value => value }) }
  const spoofed = ${author(`Foreign.${method}`, form, handler)}
  const shadowed = ParentComposition => ${author(`ParentComposition.${method}`, form, handler)}
  return { spoofed, shadowed }
})
`
        expect(
          diagnosticsFor(
            `composed-spoof-fields-${method}-${form}`,
            'no-direct-block-state-update',
            source,
          ),
        ).toEqual([])
        expect(
          diagnosticsFor(
            `composed-spoof-pure-${method}-${form}`,
            'no-impure-call-at-decision-time',
            source,
          ),
        ).toEqual([])
      })

      it(`does not grant local Message ownership to spoofed or shadowed ${method}.${form}`, () => {
        const handler = `model => { Child.Message.ClickedSave(); return { model } }`
        const source =
          parentSource +
          `
const ChildDefinition = { ${method}: Object.assign(value => value, { cases: Object.assign(value => value, { withContext: value => value }), each: value => value, on: tags => value => value, except: tags => value => value }) }
${author(`ChildDefinition.${method}`, form, handler)}
const run = ChildComposition => ${author(`ChildComposition.${method}`, form, handler)}
`
        expect(
          diagnosticsFor(
            `composed-spoof-message-${method}-${form}`,
            'no-child-message-construction-in-root',
            source,
          ),
        ).toHaveLength(2)
      })
    }
  }
})

describe('canonical InMessage union recognition through real oxlint', () => {
  const importedUnion = (body: string) => `
import { defineInMessageUnion as defineInputs } from 'foldkit/message'
const InMessage = defineInputs(${body})
`
  const namespacedUnion = (body: string) => `
import * as Message from 'foldkit/message'
const InMessage = Message.defineInMessageUnion(${body})
`
  const shadowedUnion = (body: string) => `
const Message = { defineInMessageUnion: cases => cases }
const InMessage = Message.defineInMessageUnion(${body})
`

  it('checks imported and namespaced InMessage cases without trusting shadows', () => {
    const body = '{ NoOp: {} }'

    expect(
      diagnosticsFor(
        'inmessage-noop-import',
        'no-noop-message',
        importedUnion(body),
      ),
    ).toHaveLength(1)
    expect(
      diagnosticsFor(
        'inmessage-noop-namespace',
        'no-noop-message',
        namespacedUnion(body),
      ),
    ).toHaveLength(1)
    expect(
      diagnosticsFor(
        'inmessage-noop-shadow',
        'no-noop-message',
        shadowedUnion(body),
      ),
    ).toEqual([])
  })

  it('checks imported and namespaced empty constructor calls without trusting shadows', () => {
    const body = '{ RequestedRefresh: {} }'
    const call = 'InMessage.RequestedRefresh({})'

    expect(
      diagnosticsFor(
        'inmessage-empty-constructor-import',
        'no-empty-object-tagged-call',
        importedUnion(body) + call,
      ),
    ).toHaveLength(1)
    expect(
      diagnosticsFor(
        'inmessage-empty-constructor-namespace',
        'no-empty-object-tagged-call',
        namespacedUnion(body) + call,
      ),
    ).toHaveLength(1)
    expect(
      diagnosticsFor(
        'inmessage-empty-constructor-shadow',
        'no-empty-object-tagged-call',
        shadowedUnion(body) + call,
      ),
    ).toEqual([])
  })

  it('detects imported and namespaced constructors in mapEffect without trusting shadows', () => {
    const body = '{ ReceivedChild: { message: {} } }'
    const mapEffect = `
import { Effect } from 'effect'
import * as Command from 'foldkit/command'
Command.mapEffect(command, Effect.map(InMessage.ReceivedChild))
`

    expect(
      diagnosticsFor(
        'inmessage-mapmessage-import',
        'prefer-command-mapmessage',
        importedUnion(body) + mapEffect,
      ),
    ).toHaveLength(1)
    expect(
      diagnosticsFor(
        'inmessage-mapmessage-namespace',
        'prefer-command-mapmessage',
        namespacedUnion(body) + mapEffect,
      ),
    ).toHaveLength(1)
    expect(
      diagnosticsFor(
        'inmessage-mapmessage-shadow',
        'prefer-command-mapmessage',
        shadowedUnion(body) + mapEffect,
      ),
    ).toEqual([])
  })
})
