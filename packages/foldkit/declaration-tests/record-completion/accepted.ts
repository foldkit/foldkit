import { Context, Data, Effect, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { makeFamilyDeclaration, resolveFamily } from 'foldkit/internal/block'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { taggedStruct } from 'foldkit/schema'

import {
  PrimaryRenderedBinding,
  RenderedChild,
  RenderedParent,
  RenderedParentComposition,
  importedRecordView,
  renderedChildInit,
  renderedChildUpdate,
  renderedChildView,
  renderedParentInit,
  renderedParentUpdate,
} from './view.js'

export class FirstBuild extends Context.Service<
  FirstBuild,
  Readonly<{ isAvailable: boolean }>
>()('RecordCompletion/FirstBuild') {}

export class SecondBuild extends Context.Service<
  SecondBuild,
  Readonly<{ isAvailable: boolean }>
>()('RecordCompletion/SecondBuild') {}

export class FirstBuildFailure extends Data.TaggedError('FirstBuildFailure') {}

export class SecondBuildFailure extends Data.TaggedError(
  'SecondBuildFailure',
) {}

export const FirstKey = Symbol('RecordCompletionFirst')
export const First = Block.make('RecordCompletionFirst', {
  key: FirstKey,
  Model: Schema.Struct({ first: Schema.String }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const firstComposition = First.makeComposition()
export const firstInit = firstComposition.makeInit(() => ({
  model: First.Model.make({ first: 'first' }),
}))
export const firstUpdate = firstComposition.makeUpdate({})
export const firstLayer = First.makeLayer(
  Effect.gen(function* () {
    const build = yield* FirstBuild
    if (!build.isAvailable) {
      return yield* new FirstBuildFailure()
    }

    return { children: [], init: firstInit, update: firstUpdate }
  }),
)

export const SecondKey = Symbol('RecordCompletionSecond')
export const Second = Block.make('RecordCompletionSecond', {
  key: SecondKey,
  Model: Schema.Struct({ second: Schema.Number }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const secondComposition = Second.makeComposition()
export const secondInit = secondComposition.makeInit(() => ({
  model: Second.Model.make({ second: 2 }),
}))
export const secondUpdate = secondComposition.makeUpdate({})
export const secondLayer = Second.makeLayer(
  Effect.gen(function* () {
    const build = yield* SecondBuild
    if (!build.isAvailable) {
      return yield* new SecondBuildFailure()
    }

    return { children: [], init: secondInit, update: secondUpdate }
  }),
)

export const ParentKey = Symbol('RecordCompletionParent')
export const Parent = Block.make('RecordCompletionParent', {
  key: ParentKey,
  Model: Schema.Struct({ first: First.Model, second: Second.Model }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
export const FirstBinding = Parent.makeRequiredFieldBinding(First, {
  field: 'first',
})
export const SecondBinding = Parent.makeRequiredFieldBinding(Second, {
  field: 'second',
})
export const ParentComposition = Parent.makeComposition({
  bindings: [FirstBinding, SecondBinding],
})
export const parentInit = ParentComposition.makeInit(() => ({ model: {} }))
export const parentUpdate = ParentComposition.makeUpdate({})
export const acquireParentChildren = ParentComposition.acquireChildren

export const importedRecordLayer = Parent.makeLayer({
  init: parentInit,
  update: parentUpdate,
})

export const inlineRecordLayer = Parent.makeLayer({
  init: ParentComposition.makeInit(() => ({ model: {} })),
  update: ParentComposition.makeUpdate({}),
})

const localImplementation = {
  init: parentInit,
  update: parentUpdate,
}
export const localRecordLayer = Parent.makeLayer(localImplementation)

export const renderedChildRecordLayer = RenderedChild.makeLayer({
  init: renderedChildInit,
  update: renderedChildUpdate,
  view: renderedChildView,
})

export const importedViewRecordLayer = RenderedParent.makeLayer({
  init: renderedParentInit,
  update: renderedParentUpdate,
  view: importedRecordView,
})

export const inlineViewRecordLayer = RenderedParent.makeLayer({
  init: renderedParentInit,
  update: renderedParentUpdate,
  view: RenderedParentComposition.makeView((model, h) =>
    h.block(
      PrimaryRenderedBinding.embedView({
        slotId: 'inline-primary',
        model: model.primary,
        view: renderedChildView,
        viewInputs: { label: 'Inline' },
      }),
    ),
  ),
})

const localRecordView = RenderedParentComposition.makeView((model, h) =>
  h.block(
    PrimaryRenderedBinding.embedView({
      slotId: 'local-primary',
      model: model.primary,
      view: renderedChildView,
      viewInputs: { label: 'Local' },
    }),
  ),
)
const localViewImplementation = {
  init: renderedParentInit,
  update: renderedParentUpdate,
  view: localRecordView,
}
export const localViewRecordLayer = RenderedParent.makeLayer(
  localViewImplementation,
)
export const selectedImportedViewRecordLayer = Layer.provide(
  importedViewRecordLayer,
  renderedChildRecordLayer,
)

const alternateParentComposition = Parent.makeComposition({
  bindings: [SecondBinding, FirstBinding],
})
export const alternateParentInit = alternateParentComposition.makeInit(() => ({
  model: {},
}))
export const alternateParentUpdate = alternateParentComposition.makeUpdate({})

declare const useAlternateGraph: boolean
const alignedAlternative = useAlternateGraph
  ? { init: parentInit, update: parentUpdate }
  : { init: alternateParentInit, update: alternateParentUpdate }
export const conditionalRecordLayer = Parent.makeLayer(alignedAlternative)

export const manualEffectLayer = Parent.makeLayer(
  Effect.gen(function* () {
    const children = yield* acquireParentChildren()

    return { children, init: parentInit, update: parentUpdate }
  }),
)

export const selectedImportedRecordLayer = Layer.provide(
  importedRecordLayer,
  Layer.merge(firstLayer, secondLayer),
)
export const selectedInlineRecordLayer = Layer.provide(
  inlineRecordLayer,
  Layer.merge(firstLayer, secondLayer),
)
export const selectedLocalRecordLayer = Layer.provide(
  localRecordLayer,
  Layer.merge(firstLayer, secondLayer),
)
export const selectedConditionalRecordLayer = Layer.provide(
  conditionalRecordLayer,
  Layer.merge(firstLayer, secondLayer),
)
export const selectedManualEffectLayer = Layer.provide(
  manualEffectLayer,
  Layer.merge(firstLayer, secondLayer),
)

export const childBuildServices = Layer.merge(
  Layer.succeed(FirstBuild, { isAvailable: true }),
  Layer.succeed(SecondBuild, { isAvailable: true }),
)
export const fullyProvidedImportedRecordLayer = Layer.provide(
  selectedImportedRecordLayer,
  childBuildServices,
)

export const ContextModel = Schema.Struct({ count: Schema.Number })
export type ContextModel = typeof ContextModel.Type
export const ContextMessage = defineMessageUnion({ ClickedIncrement: {} })
export type ContextMessage = typeof ContextMessage.Type

const ContextKey = Symbol('RecordCompletionContext')
export const ContextBlock = Block.make('RecordCompletionContext', {
  key: ContextKey,
  Model: ContextModel,
  Message: ContextMessage,
  InitArgs:
    Block.makeInputContract<
      readonly [seed?: number, ...labels: ReadonlyArray<string>]
    >(),
  Context:
    Block.makeInputContract<
      readonly [increment?: number, ...labels: ReadonlyArray<string>]
    >(),
})
const contextComposition = ContextBlock.makeComposition()
export const contextInit = contextComposition.makeInit(
  (seed: number = 0, ...labels: ReadonlyArray<string>) => ({
    model: ContextModel.make({ count: seed + labels.length }),
  }),
)
export const contextUpdate = contextComposition.makeUpdate.withContext(
  (increment: number = 1, ...labels: ReadonlyArray<string>) => ({
    ClickedIncrement: ContextBlock.makeFieldsStep(model => ({
      count: () => model.count + increment + labels.length,
    })),
  }),
)
export const contextRecordLayer = ContextBlock.makeLayer({
  init: contextInit,
  update: contextUpdate,
})
export const contextSubject = {
  block: ContextBlock,
  layer: contextRecordLayer,
}

export const HostedModel = Schema.Struct({ count: Schema.Number })
export type HostedModel = typeof HostedModel.Type
export const HostedMessage = defineMessageUnion({
  ClickedSave: { value: Schema.Number },
  CompletedSave: { value: Schema.Number },
})
export type HostedMessage = typeof HostedMessage.Type
export const HostedInMessage = defineInMessageUnion({
  RequestedSet: { value: Schema.Number },
  RequestedSave: { value: Schema.Number },
  RequestedReport: { value: Schema.Number },
})
export type HostedInMessage = typeof HostedInMessage.Type
export const HostedOutMessage = defineMessageUnion({
  ChangedCount: { value: Schema.Number },
})
export type HostedOutMessage = typeof HostedOutMessage.Type

export class HostedStore extends Context.Service<
  HostedStore,
  Readonly<{
    isAvailable: boolean
    save: (value: number) => Effect.Effect<void>
  }>
>()('RecordCompletion/HostedStore') {}
export const HostedHandlerFailure = taggedStruct(
  'RecordCompletionHostedHandlerFailure',
  {},
)
export type HostedHandlerFailure = typeof HostedHandlerFailure.Type

const HostedKey = Symbol('RecordCompletionHosted')
export const HostedBlock = Block.make('RecordCompletionHosted', {
  key: HostedKey,
  Model: HostedModel,
  Message: HostedMessage,
  InMessage: HostedInMessage,
  OutMessage: HostedOutMessage,
  InitArgs: Schema.Tuple([]),
  inMessageOutputs: {
    RequestedReport: { outMessage: HostedOutMessage.ChangedCount },
  },
  effects: { services: [HostedStore], Error: HostedHandlerFailure },
})
export const Save = HostedBlock.makeCommand('Save', {
  args: { value: Schema.Number },
  messages: [HostedMessage.CompletedSave],
})
const hostedComposition = HostedBlock.makeComposition()
export const hostedInit = hostedComposition.makeInit(() => ({
  model: HostedModel.make({ count: 0 }),
}))
export const hostedUpdate = hostedComposition.makeUpdate({
  ClickedSave: HostedBlock.makeCommandsStep.fromMessage(({ value }) => [
    Save({ value }),
  ]),
  CompletedSave: HostedBlock.makeOutMessageStep.fromMessage(({ value }) =>
    HostedOutMessage.ChangedCount({ value }),
  ),
})
export const hostedInMessageUpdate = hostedComposition.makeInMessageUpdate({
  RequestedSet: HostedBlock.makeFieldsStep.fromMessage(({ value }) => ({
    count: () => value,
  })),
  RequestedSave: HostedBlock.makeCommandsStep.fromMessage(({ value }) => [
    Save({ value }),
  ]),
  RequestedReport: HostedBlock.makeOutMessageStep.fromMessage(({ value }) =>
    HostedOutMessage.ChangedCount({ value }),
  ),
})
export const hostedRecordLayer = HostedBlock.makeLayer({
  init: hostedInit,
  update: hostedUpdate,
  inMessageUpdate: hostedInMessageUpdate,
  hostHandlers: [Save],
})
export const hostedEffectLayer = HostedBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: hostedInit,
    update: hostedUpdate,
    inMessageUpdate: hostedInMessageUpdate,
    hostHandlers: [Save],
  }),
)
export const hostedHandlers = Save.toLayer(
  Effect.gen(function* () {
    const store = yield* HostedStore

    if (!store.isAvailable) {
      return yield* Effect.fail(HostedHandlerFailure())
    }

    return ({ value }) =>
      Effect.as(store.save(value), HostedMessage.CompletedSave({ value }))
  }),
)
export const selectedHostedRecordLayer =
  HostedBlock.provideHandlers(hostedHandlers)(hostedRecordLayer)
export const selectedHostedEffectLayer =
  HostedBlock.provideHandlers(hostedHandlers)(hostedEffectLayer)
declare const selectHostAlternative: boolean
export const selectedAllHostBranches = HostedBlock.provideHandlers(
  selectHostAlternative ? hostedHandlers : Layer.fresh(hostedHandlers),
)(selectHostAlternative ? hostedRecordLayer : hostedEffectLayer)
export const hostedSubject = {
  block: HostedBlock,
  layer: selectedHostedRecordLayer,
}

export const contextExercise = Story.withBlock(contextSubject, executable => {
  const initialized = executable.init(2, 'initial')

  return executable.update(
    initialized.model,
    ContextMessage.ClickedIncrement(),
    3,
    'dispatch',
  )
})

export const hostedExercise = Story.withBlock(hostedSubject, executable => {
  const initialized = executable.init()
  const set = executable.inMessageUpdate(
    initialized.model,
    HostedInMessage.RequestedSet({ value: 2 }),
  )

  return executable.update(set.model, HostedMessage.CompletedSave({ value: 3 }))
})

export const FamilyModel = Schema.Struct({ value: Schema.String })
export type FamilyModel = typeof FamilyModel.Type
const FamilyKey = Symbol('RecordCompletionFamily')
export const FamilyDefinition = makeFamilyDeclaration(
  'RecordCompletionFamily',
  {
    key: FamilyKey,
    Model: FamilyModel,
    Message: Schema.Never,
    isMessageFree: true,
    InitArgs: Schema.Tuple([]),
  },
)
const familyComposition = FamilyDefinition.makeComposition()
export const familyInit = familyComposition.makeInit(() => ({
  model: FamilyModel.make({ value: 'family' }),
}))
export const familyUpdate = familyComposition.makeUpdate({})
export const makeFamilyRecordLayer = () =>
  FamilyDefinition.makeLayer({ init: familyInit, update: familyUpdate })

export class FamilyProvider extends Context.Service<
  FamilyProvider,
  Block.FamilyLifetime
>()('RecordCompletion/FamilyProvider') {}
export const familyProviderLayer = Layer.effect(
  FamilyProvider,
  Block.familyLifetime,
)
export const ResolvedFamily = resolveFamily(
  FamilyDefinition,
  FamilyProvider,
  makeFamilyRecordLayer,
  { members: { readValue: (model: FamilyModel) => model.value } },
)

export type RecordChildFailures = FirstBuildFailure | SecondBuildFailure

export const metadataEffectLayer = ContextBlock.makeLayer(
  Object.assign(
    Effect.succeed({ children: [], init: contextInit, update: contextUpdate }),
    { children: ['diagnostic child'] },
  ),
)
