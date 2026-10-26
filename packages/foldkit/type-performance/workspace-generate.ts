import { Array } from 'effect'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixtureRoot = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = resolve(fixtureRoot, '../../..')
const generatorArguments = process.argv.slice(2)
const isIncludingSaveAll = generatorArguments.includes('--save-all')
const configuredGroupCounts = generatorArguments
  .filter(argument => argument !== '--save-all')
  .map(value => globalThis.Number(value))
const groupCounts = Array.match(configuredGroupCounts, {
  onEmpty: () => [4, 8],
  onNonEmpty: values => [...values],
})
const maximumGroupCount = 32
if (
  groupCounts.some(
    groupCount =>
      !globalThis.Number.isSafeInteger(groupCount) ||
      groupCount < 1 ||
      groupCount > maximumGroupCount,
  ) ||
  new Set(groupCounts).size !== groupCounts.length
) {
  throw new Error('Group counts must be distinct integers from 1 through 32.')
}
const baseline = readFileSync(join(fixtureRoot, 'baseline.ts'), 'utf8')

const groupSource = (groupName: string) => `
const ${groupName}EditorInstance = Schema.Struct({ issueId: Schema.String, model: EditorBlock.Model })
const ${groupName}Row = Schema.Struct({ issueId: Schema.String, model: EditorBlock.Model, label: Schema.String })
const ${groupName}Model = Schema.Struct({
  groupId: Schema.Literals(['${groupName}']),
  control: ControlBlock.Model,
  maybeEditor: Schema.Option(${groupName}EditorInstance),
  rows: Schema.Array(${groupName}Row),
  lastSavedTitle: Schema.String,
})
const ${groupName}Message = defineMessageUnion({
  RequestedOpenEditor: { issueId: Schema.String },
  RequestedSaveEditor: {},
  CompletedPersistGroup: {},
  CompletedObserveGroup: {},
})
const ${groupName}OutMessage = defineMessageUnion({
  SavedIssue: { groupId: Schema.Literals(['${groupName}']), issueId: Schema.String, title: Schema.String },
})
const TypePerformance${groupName}Definition = Block.makeDefinition('TypePerformance${groupName}', {
  Model: ${groupName}Model,
  Message: ${groupName}Message,
  OutMessage: ${groupName}OutMessage,
})
const ${groupName}PersistGroup = TypePerformance${groupName}Definition.makeCommand('PersistGroup', {
  args: { issueId: Schema.String, title: Schema.String },
  messages: [${groupName}Message.CompletedPersistGroup],
  handler: function* () {
    const store = yield* WorkspaceStore
    return input => store.save(input).pipe(Effect.as(${groupName}Message.CompletedPersistGroup()))
  },
})
const ${groupName}ObserveGroup = TypePerformance${groupName}Definition.makeMount('ObserveGroup', {
  messages: [${groupName}Message.CompletedObserveGroup],
  handler: function* () {
    const store = yield* WorkspaceStore
    return ({ element }) => store.observe(element).pipe(Effect.as(${groupName}Message.CompletedObserveGroup()))
  },
})
const ${groupName}ControlBinding = TypePerformance${groupName}Definition.makeBinding(ControlBlock, { field: 'control' })
const ${groupName}EditorBinding = TypePerformance${groupName}Definition.makeBinding(EditorBlock, {
  field: 'maybeEditor', key: 'issueId', childField: 'model', placement: 'editor',
})
const ${groupName}RowsBinding = TypePerformance${groupName}Definition.makeBinding(EditorBlock, {
  field: 'rows', key: 'issueId', childField: 'model', placement: 'rows',
  init: {
    instances: () => [{ key: '${groupName}-row', args: ['${groupName}-row'] }],
    toItem: ({ key }, model) => ${groupName}Row.make({ issueId: key, model, label: 'Issue row' }),
  },
})
const ${groupName}OpenEditor = (issueId: string) => TypePerformance${groupName}Definition.makeStep(model =>
  ${groupName}EditorBinding.init({
    key: issueId,
    args: [issueId],
    toParentModel: nextEditor => modifyFields(model, {
      maybeEditor: () => Option.some(${groupName}EditorInstance.make({ issueId, model: nextEditor })),
    }),
  }),
)
const ${groupName}FoldEditorOutMessage = TypePerformance${groupName}Definition.makeOutMessageFold(EditorBlock, {
  Saved: ({ issueId, title }) => TypePerformance${groupName}Definition.makeStep(model => ({
      model: modifyFields(model, { lastSavedTitle: () => title }),
      commands: [${groupName}PersistGroup({ issueId, title })],
      outMessage: ${groupName}OutMessage.SavedIssue({ groupId: '${groupName}', issueId, title }),
    })),
})
const TypePerformance${groupName}Composition = TypePerformance${groupName}Definition.makeComposition({
  bindings: [
    ${groupName}ControlBinding.withOutMessagePolicy({ fold: TypePerformance${groupName}Definition.makeOutMessageFold(ControlBlock, {
      SelectedIssue: ({ issueId }) => ${groupName}OpenEditor(issueId),
      RequestedSaveIssue: ({ issueId }) => ${groupName}EditorBinding.requestSave(issueId),
    }) }),
    ${groupName}EditorBinding.withOutMessagePolicy({ fold: (_issueId, outMessage) => ${groupName}FoldEditorOutMessage(outMessage) }),
    ${groupName}RowsBinding.withOutMessagePolicy({ fold: (_issueId, outMessage) => ${groupName}FoldEditorOutMessage(outMessage) }),
  ],
  mounts: [${groupName}ObserveGroup],
})
type TypePerformance${groupName}ViewBuilder = Block.ViewBuilderFor<typeof TypePerformance${groupName}Composition>
const ${groupName}ContentView = (model: typeof ${groupName}Model.Type, h: TypePerformance${groupName}ViewBuilder) =>
  h.section([h.OnMount(${groupName}ObserveGroup())], [
    h.block(${groupName}ControlBinding.embedView({ slotId: 'control', model: model.control })),
    Option.match(model.maybeEditor, {
      onNone: () => h.empty,
      onSome: ({ issueId, model }) => h.block(${groupName}EditorBinding.embedView({ key: issueId, slotId: issueId, model })),
    }),
    ...Array.map(model.rows, ({ issueId, model }) => h.block(${groupName}RowsBinding.embedView({ key: issueId, slotId: issueId, model }))),
  ])
const ${groupName}View = TypePerformance${groupName}Composition.makeView((model, h) => ${groupName}ContentView(model, h))
const ${groupName}Noop = TypePerformance${groupName}Definition.makeNoopStep()
const ${groupName}Update = TypePerformance${groupName}Composition.makeUpdate({
    RequestedOpenEditor: (model, { issueId }) => ${groupName}OpenEditor(issueId)(model),
    RequestedSaveEditor: model => Option.match(model.maybeEditor, {
      onNone: () => ${groupName}Noop(model),
      onSome: ({ issueId }) => ${groupName}EditorBinding.requestSave(issueId)(model),
    }),
    CompletedPersistGroup: model => ${groupName}Noop(model),
    CompletedObserveGroup: model => ${groupName}Noop(model),
  })
const ${groupName}Init = TypePerformance${groupName}Composition.makeInit(() => ({
  model: { groupId: '${groupName}', maybeEditor: Option.none(), lastSavedTitle: '' },
}))
const ${groupName}EffectsLayer = Layer.merge(${groupName}PersistGroup.layer, ${groupName}ObserveGroup.layer)
type ${groupName}MountProviderIsExact = Expect<Equal<Exclude<Mount.RequirementsOf<typeof ${groupName}ObserveGroup>, Layer.Success<typeof ${groupName}EffectsLayer>>, never>>
const prepare${groupName} = () => TypePerformance${groupName}Composition.prepareBlock({
  init: ${groupName}Init,
  update: ${groupName}Update,
  view: ${groupName}View,
  operations: { openEditor: ${groupName}Message.RequestedOpenEditor, requestSave: ${groupName}Message.RequestedSaveEditor },
  EffectsLayer: ${groupName}EffectsLayer,
})
export interface ${groupName}Block extends Block.FromAssemblyWithViewAndOutMessage<typeof ${groupName}Model, typeof prepare${groupName}> {}
export const ${groupName}Block: ${groupName}Block = Block.assemble(prepare${groupName})
export type ${groupName}Assertions = [
  ${groupName}MountProviderIsExact,
  Expect<Equal<typeof ${groupName}Block.Model, typeof ${groupName}Model>>,
  Expect<Equal<typeof ${groupName}Block.Model.Type, typeof ${groupName}Model.Type>>,
  Expect<Equal<typeof ${groupName}Block.Model.Encoded, typeof ${groupName}Model.Encoded>>,
  Expect<Equal<typeof ${groupName}Block.Model.DecodingServices, never>>,
  Expect<Equal<typeof ${groupName}Block.Model.EncodingServices, never>>,
  Expect<Equal<typeof ${groupName}Block.OutMessage.Type, typeof ${groupName}OutMessage.Type>>,
  Expect<Equal<typeof ${groupName}Block.OutMessage.Encoded, typeof ${groupName}OutMessage.Encoded>>,
  Expect<Equal<Layer.Services<typeof ${groupName}Block.EffectsLayer>, WorkspaceStore>>,
  Expect<Equal<Layer.Error<typeof ${groupName}Block.EffectsLayer>, never>>,
  Expect<Equal<Extract<Block.ViewMountRequirementsOf<typeof ${groupName}View>, Mount.RequirementsOf<typeof ${groupName}ObserveGroup>>, Mount.RequirementsOf<typeof ${groupName}ObserveGroup>>>,
]
`

const proofTypes = `
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2 ? true : false
type Expect<Value extends true> = Value
`

const generatedPaths: globalThis.Array<string> = []

for (const groupCount of groupCounts) {
  const groups = globalThis.Array.from(
    { length: groupCount },
    (_, index) =>
      `WorkspaceGroup${globalThis.String(index + 1).padStart(3, '0')}`,
  )
  const groupsPath = join(fixtureRoot, `workspace-groups-${groupCount}.ts`)
  writeFileSync(
    groupsPath,
    `import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type * as Mount from 'foldkit/mount'
import { modifyFields } from 'foldkit/struct'
import { ControlBlock, EditorBlock, WorkspaceStore } from './workspace-shared.js'
${proofTypes}
${groups.map(groupSource).join('\n')}`,
  )

  const applicationPath = join(
    fixtureRoot,
    `workspace-composition-${groupCount}.ts`,
  )
  const fixtureBaseline = baseline
    .replace(
      "import { Context, Effect, Layer, Option, Schema } from 'effect'",
      "import { Context, Effect, Layer, Option, Schema } from 'effect'\nimport { Program } from 'foldkit'",
    )
    .replace(
      "import type * as Update from 'foldkit/update'",
      `import * as Update from 'foldkit/update'\n\nimport { ${groups.map(groupName => `${groupName}Block`).join(', ')} } from './workspace-groups-${groupCount}.js'\nimport { WorkspaceStore, WorkspaceStoreLayer } from './workspace-shared.js'`,
    )
  writeFileSync(
    applicationPath,
    `${fixtureBaseline}
const ApplicationModel = Schema.Struct({
  maybeLastSavedIssueId: Schema.Option(Schema.String),
  ${groups.map(groupName => `${groupName.charAt(0).toLowerCase() + groupName.slice(1)}: ${groupName}Block.Model,`).join('\n  ')}
})
const ApplicationMessage = ${isIncludingSaveAll ? 'defineMessageUnion({ RequestedSaveAll: {} })' : 'Schema.Never'}
const ApplicationDefinition = Block.makeDefinition('Application', { Model: ApplicationModel, Message: ApplicationMessage })
${groups
  .map(
    groupName => `const ${groupName}Binding = ApplicationDefinition.makeBinding(${groupName}Block, {
  field: '${groupName.charAt(0).toLowerCase() + groupName.slice(1)}',
}).withOutMessagePolicy({ fold: ApplicationDefinition.makeOutMessageFold(${groupName}Block, {
  SavedIssue: ({ groupId, issueId }) => ApplicationDefinition.makeFieldsStep(() => ({
    maybeLastSavedIssueId: () => Option.some(groupId + ':' + issueId),
  })),
}) })`,
  )
  .join('\n')}
const ApplicationComposition = ApplicationDefinition.makeComposition({ bindings: [${groups.map(groupName => `${groupName}Binding`).join(', ')}] })
type ApplicationViewBuilder = Block.ViewBuilderFor<typeof ApplicationComposition>
const workspaceContentView = (model: typeof ApplicationModel.Type, h: ApplicationViewBuilder) =>
  h.main([], [${groups.map(groupName => `h.block(${groupName}Binding.embedView({ slotId: '${groupName}', model: model.${groupName.charAt(0).toLowerCase() + groupName.slice(1)} }))`).join(',\n')}])
const update = ${
      isIncludingSaveAll
        ? `ApplicationComposition.makeUpdate({
  RequestedSaveAll: model => Update.combineSteps(model, [${groups.map(groupName => `${groupName}Binding.requestSave()`).join(', ')}]),
})`
        : 'ApplicationComposition.makeUpdate({})'
    }
const init = ApplicationComposition.makeInit(() => ({ model: { maybeLastSavedIssueId: Option.none() } }))
const view = ApplicationComposition.makeView(workspaceContentView)
const prepare = () => ApplicationComposition.prepareBlock({ init, update, view })
export interface ApplicationBlock extends Block.FromAssemblyWithView<typeof ApplicationModel, typeof prepare> {}
export const ApplicationBlock: ApplicationBlock = Block.assemble(prepare)
export const program = Program.makeElement({ block: ApplicationBlock, container: null })
export const providedProgram = program.provide(WorkspaceStoreLayer)

type RequirementsOf<Value> = Value extends ElementProgram<undefined, infer Requirements, never, infer _ProvidedServices> ? Requirements : never
${proofTypes}
export type Assertions = [
  Expect<Equal<RequirementsOf<typeof program>, WorkspaceStore>>,
  Expect<Equal<RequirementsOf<typeof providedProgram>, never>>,
  Expect<Equal<Layer.Services<typeof ApplicationBlock.EffectsLayer>, WorkspaceStore>>,
  Expect<Equal<Layer.Error<typeof ApplicationBlock.EffectsLayer>, never>>,
  Expect<Equal<typeof ApplicationBlock.Model, typeof ApplicationModel>>,
]
`,
  )
  generatedPaths.push(groupsPath, applicationPath)
}

execFileSync(join(workspaceRoot, 'node_modules/.bin/oxfmt'), generatedPaths, {
  cwd: workspaceRoot,
  stdio: 'inherit',
})
