import { Effect, Schema } from 'effect'
import { Block, Message, Update } from 'foldkit'

import {
  ChildBinding,
  ContextCounterBlock,
  CounterBlock,
  CounterComposition,
  CounterDefinition,
  DecoratedCounterBlock,
  type LargeContext,
  LargeContextComposition,
  LargeContextDefinition,
  LargeContextMessage,
  LocalMessage,
  Model,
  OutMessage,
  ParentComposition,
  ParentDefinition,
  Save,
  contextualUpdate,
  init,
  update,
} from './record-update.accepted.js'

const quietStep = CounterDefinition.makeNoopStep()
const validCases = {
  RequestedQuiet: quietStep,
  RequestedReport: quietStep,
  RequestedSave: quietStep,
  CompletedSave: quietStep,
}

const largeNoopStep = LargeContextDefinition.makeNoopStep()
const validLargeCases = {
  PressedKey: largeNoopStep,
  ChangedCount: largeNoopStep,
  BlurredInput: largeNoopStep,
  SubmittedSave: largeNoopStep,
  RequestedReport: largeNoopStep,
  UpdatedRemote: largeNoopStep,
  FailedRemote: largeNoopStep,
  CompletedLoad: largeNoopStep,
  SucceededFetch: largeNoopStep,
  FailedFetch: largeNoopStep,
  ClickedCopy: largeNoopStep,
  SucceededCopy: largeNoopStep,
  CompletedWait: largeNoopStep,
  InformedJoin: largeNoopStep,
  SucceededJoin: largeNoopStep,
  CompletedSave: largeNoopStep,
}

// @ts-expect-error Large contextual records retain the owning Model contract.
LargeContextComposition.makeUpdate.withContext((_context: LargeContext) => ({
  ...validLargeCases,
  FailedFetch: () => ({ model: { count: 'bad' } }),
}))

declare const unknownLargeRegistration: Update.WithRegistrationEvidence<
  Update.Return<typeof Model.Type, typeof LargeContextMessage.Type>,
  unknown
>
// @ts-expect-error Large contextual records retain exact registration evidence.
LargeContextComposition.makeUpdate.withContext((_context: LargeContext) => ({
  ...validLargeCases,
  UpdatedRemote: () => unknownLargeRegistration,
}))

// @ts-expect-error Every local Message needs a handler.
CounterComposition.makeUpdate({ RequestedQuiet: quietStep })
// @ts-expect-error Extra handlers are rejected even when extracted.
CounterComposition.makeUpdate({ ...validCases, Undeclared: quietStep })
const extraCases = { ...validCases, Undeclared: quietStep }
// @ts-expect-error Structural assignment cannot hide an extra handler.
CounterComposition.makeUpdate(extraCases)
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error The handler receives the owning Model.
  RequestedQuiet: (_model: { count: string }) => ({
    model: Model.make({ count: 0 }),
  }),
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error The handler must accept the complete payload for its tag.
  RequestedReport: (
    model: typeof Model.Type,
    _message: { _tag: 'RequestedReport'; amount: 1 },
  ) => ({ model }),
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A raw result Model must match the Definition.
  RequestedQuiet: () => ({
    model: { count: 'bad' },
    commands: undefined,
    outMessage: undefined,
  }),
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error Record handlers cannot return an unrelated value.
  RequestedQuiet: () => undefined,
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A never return does not prove a valid handler.
  RequestedQuiet: () => {
    throw new Error('never')
  },
})

declare const erased: any
declare const unknownOutput: unknown
// @ts-expect-error A handler returning any cannot bypass validation.
CounterComposition.makeUpdate({ ...validCases, RequestedQuiet: () => erased })
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error Unknown result shape cannot bypass validation.
  RequestedQuiet: () => unknownOutput,
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error An erased Model channel cannot bypass validation.
  RequestedQuiet: () => ({
    model: erased,
    commands: undefined,
    outMessage: undefined,
  }),
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error An erased Command collection cannot bypass validation.
  RequestedQuiet: (model: typeof Model.Type) => ({
    model,
    commands: erased,
    outMessage: undefined,
  }),
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error An erased OutMessage cannot bypass validation.
  RequestedQuiet: (model: typeof Model.Type) => ({
    model,
    commands: undefined,
    outMessage: erased,
  }),
})

const WrongMessage = Message.defineMessageUnion({ CompletedForeign: {} })
const wrongCommand = {
  name: 'Foreign',
  effect: Effect.succeed(WrongMessage.CompletedForeign()),
}
// @ts-expect-error Inline contextual handlers retain the owning Command Message channel.
LargeContextComposition.makeUpdate.withContext((_context: LargeContext) => ({
  ...validLargeCases,
  ClickedCopy: model => ({ model, commands: [wrongCommand] }),
}))
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error Command Messages remain owned by the Definition.
  RequestedQuiet: (model: typeof Model.Type) => ({
    model,
    commands: [wrongCommand],
    outMessage: undefined,
  }),
})
const failedCommand = { name: 'Failed', effect: Effect.fail('Failed') }
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error Command failure must become a Message.
  RequestedQuiet: (model: typeof Model.Type) => ({
    model,
    commands: [failedCommand],
    outMessage: undefined,
  }),
})
const WrongOutMessage = Message.defineMessageUnion({
  ReportedCount: { count: Schema.String },
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A matching OutMessage tag does not erase its payload contract.
  RequestedQuiet: (model: typeof Model.Type) => ({
    model,
    commands: undefined,
    outMessage: WrongOutMessage.ReportedCount({ count: 'bad' }),
  }),
})

// @ts-expect-error Completion still requires each Command handler.
CounterComposition.prepareBlock({ init, update })
// @ts-expect-error Quiet operation requirements cannot absorb a real Save handler.
const _quietRequirement: Update.RequirementsOf<
  typeof import('./record-update.accepted.js').CounterBlock.operations.quiet
> = Save

declare const unknownRegistration: Update.WithRegistrationEvidence<
  Update.Return<typeof Model.Type, typeof LocalMessage.Type>,
  unknown
>
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error Unknown registration evidence cannot be erased by a handler record.
  RequestedQuiet: () => unknownRegistration,
})
declare const erasedRegistration: Update.WithRegistrationEvidence<
  Update.Return<typeof Model.Type, typeof LocalMessage.Type>,
  any
>
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error Any registration evidence cannot be erased by a handler record.
  RequestedQuiet: () => erasedRegistration,
})

const parentQuietStep = ParentDefinition.makeNoopStep()
const parentCases = {
  RequestedQuiet: parentQuietStep,
  RequestedReport: parentQuietStep,
  RequestedSave: parentQuietStep,
  CompletedSave: parentQuietStep,
}
ParentDefinition.makeComposition().makeUpdate({
  ...parentCases,
  // @ts-expect-error A connected operation requires its registered child graph.
  RequestedQuiet: model => ChildBinding.quiet()(model),
})
ParentComposition.makeUpdate({
  ...parentCases,
  // @ts-expect-error A combination cannot discard the selected emitting operation's OutMessage.
  RequestedReport: model =>
    Update.combineSteps(model, [
      ChildBinding.report({ amount: 1 }),
      ParentDefinition.makeNoopStep(),
    ]),
})
const emittedStep = ParentDefinition.makeStep(() =>
  Update.combineSteps([
    ChildBinding.report({ amount: 1 }),
    ParentDefinition.makeNoopStep(),
  ]),
)
ParentComposition.makeUpdate({
  ...parentCases,
  // @ts-expect-error Extracting a combination through a Definition Step preserves the obligation.
  RequestedReport: model => emittedStep(model),
})

// @ts-expect-error Declared context is required during dispatch.
contextualUpdate(Model.make({ count: 0 }), LocalMessage.RequestedQuiet())
// @ts-expect-error Context payloads retain their type.
contextualUpdate(Model.make({ count: 0 }), LocalMessage.RequestedQuiet(), 'bad')
// @ts-expect-error Constructor operations retain their update context.
ContextCounterBlock.operations.report(Model.make({ count: 0 }), { amount: 1 })
// @ts-expect-error Tuple operations retain their exact argument shape.
ContextCounterBlock.operations.reportAmount(Model.make({ count: 0 }), 1, 'bad')
// @ts-expect-error The context factory cannot accept any context.
CounterComposition.makeUpdate.withContext((_context: any) => validCases)
// @ts-expect-error Context factories still validate every handler.
CounterComposition.makeUpdate.withContext((_context: number) => ({
  ...validCases,
  RequestedQuiet: () => ({
    model: { count: 'bad' },
    commands: undefined,
    outMessage: undefined,
  }),
}))
// @ts-expect-error Emitting results cannot masquerade as a silent ordinary Step.
const _silentStep: Update.Step<typeof Model.Type, typeof LocalMessage.Type> = (
  model: typeof Model.Type,
) => ({ model, outMessage: OutMessage.ReportedCount({ count: 1 }) })
// @ts-expect-error Owned result constructors do not accept foreign result Messages.
CounterDefinition.makeCommandsStep(() => [wrongCommand])

ParentComposition.makeUpdate({
  ...parentCases,
  // @ts-expect-error A record handler cannot erase an emitting connected combination.
  RequestedQuiet: model =>
    Update.combineSteps(model, [
      ChildBinding.report({ amount: 1 }),
      ParentDefinition.makeNoopStep(),
    ]),
})

import {
  optionalContextUpdate,
  requiredRestContextUpdate,
  restContextUpdate,
} from './record-update.accepted.js'
optionalContextUpdate(
  Model.make({ count: 0 }),
  LocalMessage.RequestedQuiet(),
  // @ts-expect-error Optional context values retain their exact type.
  'bad',
)
restContextUpdate(
  Model.make({ count: 0 }),
  LocalMessage.RequestedQuiet(),
  2,
  // @ts-expect-error Rest context values retain their exact element type.
  'bad',
)
// @ts-expect-error A required rest tuple retains its mandatory context.
requiredRestContextUpdate(
  Model.make({ count: 0 }),
  LocalMessage.RequestedQuiet(),
)

CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A handler record still rejects unknown graph evidence.
  RequestedQuiet: () => unknownRegistration,
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A handler record still rejects any graph evidence.
  RequestedQuiet: () => erasedRegistration,
})

// @ts-expect-error Old callback authoring is rejected.
CounterComposition.makeUpdate(model => ({ model }))

const erasedQuietOperation: (
  ...args: Parameters<typeof CounterBlock.operations.quiet>
) => ReturnType<typeof CounterBlock.operations.quiet> =
  CounterBlock.operations.quiet

// @ts-expect-error Erasing metadata cannot reconstruct a compiler-derived silent hint.
const reconstructedQuietOperation: typeof CounterBlock.operations.quiet =
  erasedQuietOperation
void reconstructedQuietOperation

declare const ErasedCounterBlock: Omit<typeof CounterBlock, 'operations'> &
  Readonly<{
    operations: Omit<typeof CounterBlock.operations, 'quiet'> &
      Readonly<{ quiet: typeof erasedQuietOperation }>
  }>
const ErasedChildBinding = ParentDefinition.makeBinding(ErasedCounterBlock, {
  field: 'child',
}).withOutMessagePolicy({
  forward: ParentDefinition.makeOutMessageForward(ErasedCounterBlock, {
    ReportedCount: ({ count }) => OutMessage.ReportedCount({ count }),
  }),
})
const ErasedParentComposition = ParentDefinition.makeComposition({
  bindings: [ErasedChildBinding],
})
ErasedParentComposition.makeUpdate({
  ...parentCases,
  // @ts-expect-error Missing operation metadata conservatively retains the emitting parent policy.
  RequestedQuiet: model =>
    Update.combineSteps(model, [
      ErasedChildBinding.quiet(),
      ParentDefinition.makeNoopStep(),
    ]),
})

const DecoratedBinding = ParentDefinition.makeBinding(DecoratedCounterBlock, {
  field: 'child',
}).withOutMessagePolicy({
  forward: ParentDefinition.makeOutMessageForward(DecoratedCounterBlock, {
    ReportedCount: ({ count }) => OutMessage.ReportedCount({ count }),
  }),
})
const DecoratedComposition = ParentDefinition.makeComposition({
  bindings: [DecoratedBinding],
})
DecoratedComposition.makeUpdate({
  ...parentCases,
  // @ts-expect-error Decoration does not suppress a tuple operation's derived emission metadata.
  RequestedQuiet: model =>
    Update.combineSteps(model, [
      DecoratedBinding.reportTuple(3),
      ParentDefinition.makeNoopStep(),
    ]),
})
DecoratedComposition.makeUpdate({
  ...parentCases,
  // @ts-expect-error Decoration does not suppress a constructor operation's derived emission metadata.
  RequestedQuiet: model =>
    Update.combineSteps(model, [
      DecoratedBinding.reportConstructor({ amount: 3 }),
      ParentDefinition.makeNoopStep(),
    ]),
})

const completedReportOperation = Object.assign(
  (...args: Parameters<typeof CounterBlock.operations.report>) =>
    CounterBlock.operations.report(...args),
  { ...CounterBlock.operations.quiet },
)
CounterComposition.prepareBlock({
  init,
  update,
  operations: {
    // @ts-expect-error Authoring accepts Message producers, not completed operations.
    report: completedReportOperation,
  },
  EffectsLayer: Save.layer,
})

type CounterUpdate = Block.DefinedUpdate<
  typeof Model.Type,
  typeof LocalMessage.Type,
  readonly [],
  typeof OutMessage.Type,
  Update.RequirementsOf<typeof update>,
  never
>

const aggregateCounterUpdate: CounterUpdate = update
void aggregateCounterUpdate

// @ts-expect-error Exact operation metadata cannot widen to unknown tuple channels.
const widenedOperationOutputs: CounterUpdate &
  Block.OperationOutputs<
    readonly [
      tag: string,
      outMessage: unknown,
      requirements: unknown,
      registration: unknown,
    ]
  > = update
void widenedOperationOutputs

const PlainMessage = Schema.Struct({ value: Schema.String })
const PlainComposition = Block.makeDefinition('PlainRecordUpdate', {
  Model,
  Message: PlainMessage,
}).makeComposition()
// @ts-expect-error Record authoring requires every local Message to have a finite literal tag.
PlainComposition.makeUpdate({})
// @ts-expect-error Contextual record authoring has the same finite tag requirement.
PlainComposition.makeUpdate.withContext(() => ({}))

const MixedMessage = Schema.Union([LocalMessage, PlainMessage])
const MixedComposition = Block.makeDefinition('MixedRecordUpdate', {
  Model,
  Message: MixedMessage,
}).makeComposition()
// @ts-expect-error A tagged constituent cannot hide an untagged local Message.
MixedComposition.makeUpdate(validCases)
// @ts-expect-error Contextual records must also reject an untagged local Message constituent.
MixedComposition.makeUpdate.withContext(() => validCases)

const OpenTagMessage = Schema.Struct({ _tag: Schema.String })
const OpenTagComposition = Block.makeDefinition('OpenTagRecordUpdate', {
  Model,
  Message: OpenTagMessage,
}).makeComposition()
// @ts-expect-error An open string tag cannot define a finite exhaustive record.
OpenTagComposition.makeUpdate({})
// @ts-expect-error Context does not close an open string tag.
OpenTagComposition.makeUpdate.withContext(() => ({}))

const TemplateTagComposition = Block.makeDefinition('TemplateTagRecordUpdate', {
  Model,
  Message: Schema.Struct({
    _tag: Schema.TemplateLiteral(['Requested', Schema.String]),
  }),
}).makeComposition()
// @ts-expect-error A template index does not enumerate a finite set of tags.
TemplateTagComposition.makeUpdate({})
// @ts-expect-error Context does not make an infinite template tag exhaustive.
TemplateTagComposition.makeUpdate.withContext(() => ({}))

const BrandedTagComposition = Block.makeDefinition('BrandedTagRecordUpdate', {
  Model,
  Message: Schema.Struct({
    _tag: Schema.String.pipe(Schema.brand('RecordMessageTag')),
  }),
}).makeComposition()
// @ts-expect-error Branding an open string does not enumerate its handlers.
BrandedTagComposition.makeUpdate({})
// @ts-expect-error Context does not make a branded open tag exhaustive.
BrandedTagComposition.makeUpdate.withContext(() => ({}))

const ForeignModel = Schema.Struct({ title: Schema.String })
const ForeignOutMessage = Message.defineMessageUnion({ ChangedTitle: {} })

declare const correctRecipe: Update.ResultRecipe<
  typeof Model.Type,
  typeof LocalMessage.Type,
  typeof OutMessage.Type
>
declare const wrongModelRecipe: Update.ResultRecipe<
  typeof ForeignModel.Type,
  typeof LocalMessage.Type
>
declare const wrongMessageRecipe: Update.ResultRecipe<
  typeof Model.Type,
  typeof WrongMessage.Type
>
declare const wrongOutMessageRecipe: Update.ResultRecipe<
  typeof Model.Type,
  typeof LocalMessage.Type,
  typeof ForeignOutMessage.Type
>

CounterComposition.makeUpdate({
  ...validCases,
  RequestedQuiet: () => correctRecipe,
})
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  RequestedQuiet: () => correctRecipe,
}))
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A received recipe must retain the owning Model.
  RequestedQuiet: () => wrongModelRecipe,
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A received recipe must retain the owning Message.
  RequestedQuiet: () => wrongMessageRecipe,
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A received recipe must retain the declared OutMessage.
  RequestedQuiet: () => wrongOutMessageRecipe,
})
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  // @ts-expect-error Contextual handlers retain the recipe's owning Model boundary.
  RequestedQuiet: () => wrongModelRecipe,
}))
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  // @ts-expect-error Contextual handlers retain the recipe's owning Message boundary.
  RequestedQuiet: () => wrongMessageRecipe,
}))
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  // @ts-expect-error Contextual handlers retain the recipe's OutMessage boundary.
  RequestedQuiet: () => wrongOutMessageRecipe,
}))

declare const correctRecipeOrRaw:
  | typeof correctRecipe
  | Update.Return<typeof Model.Type, typeof LocalMessage.Type>
declare const correctRecipeOrWrongRawModel:
  | typeof correctRecipe
  | Update.Return<typeof ForeignModel.Type, typeof LocalMessage.Type>
declare const correctRecipeOrWrongRawMessage:
  | typeof correctRecipe
  | Update.Return<typeof Model.Type, typeof WrongMessage.Type>
declare const correctRecipeOrWrongRawOutMessage:
  | typeof correctRecipe
  | Update.ReturnWithOutMessage<
      typeof Model.Type,
      typeof LocalMessage.Type,
      typeof ForeignOutMessage.Type
    >

CounterComposition.makeUpdate({
  ...validCases,
  RequestedQuiet: () => correctRecipeOrRaw,
})
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  RequestedQuiet: () => correctRecipeOrRaw,
}))
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A valid recipe cannot hide a raw result with the wrong Model.
  RequestedQuiet: () => correctRecipeOrWrongRawModel,
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A valid recipe cannot hide a raw result with the wrong Message.
  RequestedQuiet: () => correctRecipeOrWrongRawMessage,
})
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A valid recipe cannot hide a raw result with the wrong OutMessage.
  RequestedQuiet: () => correctRecipeOrWrongRawOutMessage,
})
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  // @ts-expect-error A contextual valid recipe cannot hide a raw result with the wrong Model.
  RequestedQuiet: () => correctRecipeOrWrongRawModel,
}))
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  // @ts-expect-error A contextual valid recipe cannot hide a raw result with the wrong Message.
  RequestedQuiet: () => correctRecipeOrWrongRawMessage,
}))
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  // @ts-expect-error A contextual valid recipe cannot hide a raw result with the wrong OutMessage.
  RequestedQuiet: () => correctRecipeOrWrongRawOutMessage,
}))

type ErasedModelReturn = Readonly<{
  model: typeof erased
  commands: undefined
  outMessage: undefined
}>
type ErasedCommandsReturn = Readonly<{
  model: typeof Model.Type
  commands: typeof erased
  outMessage: undefined
}>
type ErasedOutMessageReturn = Readonly<{
  model: typeof Model.Type
  commands: undefined
  outMessage: typeof erased
}>
declare const rawOrErasedModel:
  | Update.Return<typeof Model.Type, typeof LocalMessage.Type>
  | ErasedModelReturn
declare const rawOrErasedCommands:
  | Update.Return<typeof Model.Type, typeof LocalMessage.Type>
  | ErasedCommandsReturn
declare const rawOrErasedOutMessage:
  | Update.Return<typeof Model.Type, typeof LocalMessage.Type>
  | ErasedOutMessageReturn
declare const recipeOrErasedModel: typeof correctRecipe | ErasedModelReturn
declare const recipeOrErasedCommands:
  | typeof correctRecipe
  | ErasedCommandsReturn
declare const recipeOrErasedOutMessage:
  | typeof correctRecipe
  | ErasedOutMessageReturn

CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error Every raw union branch must retain a concrete Model.
  RequestedQuiet: () => rawOrErasedModel,
})
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  // @ts-expect-error Contextual raw union branches must retain a concrete Model.
  RequestedQuiet: () => rawOrErasedModel,
}))
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error Every raw union branch must retain concrete Commands.
  RequestedQuiet: () => rawOrErasedCommands,
})
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  // @ts-expect-error Contextual raw union branches must retain concrete Commands.
  RequestedQuiet: () => rawOrErasedCommands,
}))
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error Every raw union branch must retain a concrete OutMessage.
  RequestedQuiet: () => rawOrErasedOutMessage,
})
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  // @ts-expect-error Contextual raw union branches must retain a concrete OutMessage.
  RequestedQuiet: () => rawOrErasedOutMessage,
}))
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A recipe cannot hide a raw union branch with an erased Model.
  RequestedQuiet: () => recipeOrErasedModel,
})
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  // @ts-expect-error A contextual recipe cannot hide a raw union branch with an erased Model.
  RequestedQuiet: () => recipeOrErasedModel,
}))
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A recipe cannot hide a raw union branch with erased Commands.
  RequestedQuiet: () => recipeOrErasedCommands,
})
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  // @ts-expect-error A contextual recipe cannot hide a raw union branch with erased Commands.
  RequestedQuiet: () => recipeOrErasedCommands,
}))
CounterComposition.makeUpdate({
  ...validCases,
  // @ts-expect-error A recipe cannot hide a raw union branch with an erased OutMessage.
  RequestedQuiet: () => recipeOrErasedOutMessage,
})
CounterComposition.makeUpdate.withContext(() => ({
  ...validCases,
  // @ts-expect-error A contextual recipe cannot hide a raw union branch with an erased OutMessage.
  RequestedQuiet: () => recipeOrErasedOutMessage,
}))
