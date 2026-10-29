import { Array, Effect, Layer, Option, Schema, Tuple } from 'effect'
import { Block, Command, Message, Struct, Update } from 'foldkit'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false
type Expect<Value extends true> = Value
type EveryMemberEqual<Value, Expected> = Equal<
  Value extends unknown ? Equal<Value, Expected> : never,
  true
>
type RecipeModel<Value> =
  Value extends Update.ResultRecipe<
    infer Model,
    infer _Message,
    infer _OutMessage,
    infer _Requirements,
    infer _Evidence
  >
    ? Model
    : never
type RecipeMessage<Value> =
  Value extends Update.ResultRecipe<
    infer _Model,
    infer Message,
    infer _OutMessage,
    infer _Requirements,
    infer _Evidence
  >
    ? Message
    : never

export const ChildModel = Schema.Struct({ count: Schema.Number })
export type ChildModel = typeof ChildModel.Type
export const ChildMessage = Message.defineMessageUnion({ Incremented: {} })
export type ChildMessage = typeof ChildMessage.Type

declare const plainUpdate: Block.DefinedUpdate<
  ChildModel,
  ChildMessage,
  readonly [],
  never,
  never,
  never
>
declare const optionalContextUpdate: Block.DefinedUpdate<
  ChildModel,
  ChildMessage,
  readonly [context?: Readonly<{ amount: number }>],
  never,
  never,
  never
>
declare const restContextUpdate: Block.DefinedUpdate<
  ChildModel,
  ChildMessage,
  readonly [context: Readonly<{ amount: number }>],
  never,
  never,
  never
>

const CompositionSafetyPlainComposition = Block.makeDefinition(
  'CompositionSafetyPlain',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const preparePlainBlock = () =>
  CompositionSafetyPlainComposition.prepareBlock({
    init: CompositionSafetyPlainComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
    })),
    update: plainUpdate,
    operations: { increment: ChildMessage.Incremented },
    EffectsLayer: Layer.empty,
  })
export const PlainBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof preparePlainBlock
> = Block.assemble(preparePlainBlock)

const CompositionSafetyOptionalContextComposition = Block.makeDefinition(
  'CompositionSafetyOptionalContext',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareOptionalContextBlock = () =>
  CompositionSafetyOptionalContextComposition.prepareBlock({
    init: CompositionSafetyOptionalContextComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
    })),
    update: optionalContextUpdate,
    EffectsLayer: Layer.empty,
  })
export const OptionalContextBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareOptionalContextBlock
> = Block.assemble(prepareOptionalContextBlock)

const CompositionSafetyRestContextComposition = Block.makeDefinition(
  'CompositionSafetyRestContext',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareRestContextBlock = () =>
  CompositionSafetyRestContextComposition.prepareBlock({
    init: CompositionSafetyRestContextComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
    })),
    update: restContextUpdate,
    EffectsLayer: Layer.empty,
  })
export const RestContextBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareRestContextBlock
> = Block.assemble(prepareRestContextBlock)

export const ParameterizedChildModel = Schema.Struct({ count: Schema.Number })
export const ParameterizedChildMessage = Message.defineMessageUnion({
  CompletedLoad: {},
})
const CompositionSafetyParameterizedDefinition = Block.makeDefinition(
  'CompositionSafetyParameterized',
  {
    Model: ParameterizedChildModel,
    Message: ParameterizedChildMessage,
  },
)
export const LoadParameterizedChild =
  CompositionSafetyParameterizedDefinition.makeCommand(
    'LoadParameterizedChild',
    {
      messages: [ParameterizedChildMessage.CompletedLoad],
      handler: function* () {
        return () => Effect.succeed(ParameterizedChildMessage.CompletedLoad())
      },
    },
  )
const CompositionSafetyParameterizedComposition =
  CompositionSafetyParameterizedDefinition.makeComposition()
const prepareParameterizedBlock = () =>
  CompositionSafetyParameterizedComposition.prepareBlock({
    init: CompositionSafetyParameterizedComposition.makeInit(
      (count: number) => ({
        model: ParameterizedChildModel.make({ count }),
        commands: [LoadParameterizedChild()],
      }),
    ),
    update: CompositionSafetyParameterizedComposition.makeUpdate({
      CompletedLoad: model => ({
        model,
      }),
    }),
    EffectsLayer: LoadParameterizedChild.layer,
  })
export const ParameterizedBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParameterizedChildModel,
  typeof prepareParameterizedBlock
> = Block.assemble(prepareParameterizedBlock)

export const Entry = Schema.Struct({
  id: Schema.String,
  child: ParameterizedChildModel,
})

export const ParentModel = Schema.Struct({
  route: Schema.Literals(['Home', 'Play']),
  first: ChildModel,
  second: ChildModel,
  plain: ChildModel,
  optionalContext: ChildModel,
  restContext: ChildModel,
  entries: Schema.Array(Entry),
})
export const ParentMessage = Message.defineMessageUnion({
  CompletedParentInitialization: {},
  RequestedInitEntry: { id: Schema.String, count: Schema.Number },
  RequestedInitPlain: {},
  RequestedInitPlainWithOwningParentCommand: {},
  RequestedInitPlainWithParentCommands: {},
})
export const CompositionSafetyParentDefinition = Block.makeDefinition(
  'CompositionSafetyParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)
export const CompleteParentInitialization =
  CompositionSafetyParentDefinition.makeCommand(
    'CompleteParentInitialization',
    {
      messages: [ParentMessage.CompletedParentInitialization],
      handler: function* () {
        return () =>
          Effect.succeed(ParentMessage.CompletedParentInitialization())
      },
    },
  )

export const StableProjectedBinding =
  CompositionSafetyParentDefinition.makeBinding(PlainBlock, {
    placement: 'stableProjected',
    read: model => Option.some(model.first),
    write: (model, nextChild) =>
      Struct.modifyFields(model, { first: () => nextChild }),

    init: {
      contextToArgs: () => [],
      toParentFields: child => ({ first: child }),
    },
  })
export const PlainBinding = CompositionSafetyParentDefinition.makeBinding(
  PlainBlock,
  {
    field: 'plain',

    init: false,
  },
)
export const ParentCommandsBinding =
  CompositionSafetyParentDefinition.makeBinding(PlainBlock, {
    placement: 'parentCommands',
    read: model => Option.some(model.plain),
    write: (model, nextChild) =>
      Struct.modifyFields(model, { plain: () => nextChild }),
  })
export const OptionalContextBinding =
  CompositionSafetyParentDefinition.makeBinding(OptionalContextBlock, {
    field: 'optionalContext',

    delivery: {
      toUpdateContext: () => [],
    },
  })
export const RestContextBinding = CompositionSafetyParentDefinition.makeBinding(
  RestContextBlock,
  {
    field: 'restContext',

    delivery: {
      toUpdateContext: () => [{ amount: 1 }],
    },
  },
)
export const EntryBinding = CompositionSafetyParentDefinition.makeBinding(
  ParameterizedBlock,
  {
    field: 'entries',
    placement: 'entries',
    key: 'id',
    childField: 'child',
  },
)

export const initialParentModel = ParentModel.make({
  route: 'Home',
  first: ChildModel.make({ count: 0 }),
  second: ChildModel.make({ count: 0 }),
  plain: ChildModel.make({ count: 0 }),
  optionalContext: ChildModel.make({ count: 0 }),
  restContext: ChildModel.make({ count: 0 }),
  entries: [],
})

// eslint-disable-next-line foldkit/block-name-matches-variable
const foldComposition = CompositionSafetyParentDefinition.makeComposition({
  bindings: [StableProjectedBinding, PlainBinding],
})
export const foldStableProjected = foldComposition.makeUpdate.withContext(
  (childMessage: typeof ChildMessage.Type) => ({
    CompletedParentInitialization: (model, _message) =>
      StableProjectedBinding.fold(model, childMessage),
    RequestedInitEntry: (model, _message) =>
      StableProjectedBinding.fold(model, childMessage),
    RequestedInitPlain: (model, _message) =>
      StableProjectedBinding.fold(model, childMessage),
    RequestedInitPlainWithOwningParentCommand: (model, _message) =>
      StableProjectedBinding.fold(model, childMessage),
    RequestedInitPlainWithParentCommands: (model, _message) =>
      StableProjectedBinding.fold(model, childMessage),
  }),
)
export const foldPlain = foldComposition.makeUpdate.withContext(
  (childMessage: typeof ChildMessage.Type) => ({
    CompletedParentInitialization: (model, _message) =>
      PlainBinding.fold(model, childMessage),
    RequestedInitEntry: (model, _message) =>
      PlainBinding.fold(model, childMessage),
    RequestedInitPlain: (model, _message) =>
      PlainBinding.fold(model, childMessage),
    RequestedInitPlainWithOwningParentCommand: (model, _message) =>
      PlainBinding.fold(model, childMessage),
    RequestedInitPlainWithParentCommands: (model, _message) =>
      PlainBinding.fold(model, childMessage),
  }),
)

const plainInitializerDocumentation = PlainBinding.init({
  args: [],
  toParentModel: child =>
    Struct.modifyFields(initialParentModel, { plain: () => child }),
})
const keyedInitializerDocumentation = EntryBinding.init({
  key: 'documented-entry',
  args: [0],
  toParentModel: child =>
    Struct.modifyFields(initialParentModel, {
      entries: Array.append(Entry.make({ id: 'documented-entry', child })),
    }),
})
void plainInitializerDocumentation
void keyedInitializerDocumentation

export const initPlainStep = CompositionSafetyParentDefinition.makeStep(model =>
  PlainBinding.init({
    args: [],
    toParentModel: child => Struct.modifyFields(model, { plain: () => child }),
  }),
)
export const initEntryStep = CompositionSafetyParentDefinition.makeStep(
  (model, id: string, count: number) =>
    EntryBinding.init({
      key: id,
      args: [count],
      toParentModel: child =>
        Struct.modifyFields(model, {
          entries: Array.append(Entry.make({ id, child })),
        }),
    }),
)
const initParentCommandEntryStep = CompositionSafetyParentDefinition.makeStep(
  model =>
    EntryBinding.init({
      key: 'parent-command-entry',
      args: [1],
      toParentModel: child =>
        Struct.modifyFields(model, {
          entries: Array.append(
            Entry.make({ id: 'parent-command-entry', child }),
          ),
        }),
    }),
)
const initParentCommandChildStep = CompositionSafetyParentDefinition.makeStep(
  model =>
    ParentCommandsBinding.init({
      args: [],
      toParentModel: child =>
        Struct.modifyFields(model, { plain: () => child }),
      commands: [CompleteParentInitialization()],
    }),
)
export const initPlainWithParentCommandsStep = Update.combineSteps([
  initParentCommandEntryStep,
  initParentCommandChildStep,
])
export const makeParentCommandInitRecipe = () =>
  ParentCommandsBinding.init({
    args: [],
    toParentModel: child =>
      Struct.modifyFields(initialParentModel, { plain: () => child }),
    commands: [CompleteParentInitialization()],
  })
export const initPlainWithOwningParentCommandStep =
  CompositionSafetyParentDefinition.makeStep(model =>
    ParentCommandsBinding.init({
      args: [],
      toParentModel: child =>
        Struct.modifyFields(model, { plain: () => child }),
      commands: [CompleteParentInitialization()],
    }),
  )
const initDerivedEntryStep = CompositionSafetyParentDefinition.makeStep(model =>
  EntryBinding.init({
    key: 'derived-entry',
    args: [2],
    toParentModel: child =>
      Struct.modifyFields(model, {
        entries: Array.append(Entry.make({ id: 'derived-entry', child })),
      }),
  }),
)
export const initDerivedStepsStep = Update.combineSteps([
  initDerivedEntryStep,
  initPlainWithOwningParentCommandStep,
])

export const CompositionSafetyParentComposition =
  CompositionSafetyParentDefinition.makeComposition({
    bindings: [PlainBinding, ParentCommandsBinding, EntryBinding],
  })

export const mixedConnectedSteps = Tuple.make(
  PlainBinding.increment(),
  CompositionSafetyParentDefinition.makeNoopStep(),
)
export const combinedMixedConnectedStep =
  Update.combineSteps(mixedConnectedSteps)
export const deferredMixedConnectedStep =
  CompositionSafetyParentDefinition.makeStep(() =>
    Update.combineSteps(mixedConnectedSteps),
  )
export const mixedConnectedUpdate =
  CompositionSafetyParentComposition.makeUpdate({
    CompletedParentInitialization: model =>
      Update.combineSteps(model, [
        PlainBinding.increment(),
        CompositionSafetyParentDefinition.makeNoopStep(),
      ]),
    RequestedInitEntry: model =>
      Update.combineSteps(model, [
        PlainBinding.increment(),
        CompositionSafetyParentDefinition.makeNoopStep(),
      ]),
    RequestedInitPlain: model =>
      Update.combineSteps(model, [
        PlainBinding.increment(),
        CompositionSafetyParentDefinition.makeNoopStep(),
      ]),
    RequestedInitPlainWithOwningParentCommand: model =>
      Update.combineSteps(model, [
        PlainBinding.increment(),
        CompositionSafetyParentDefinition.makeNoopStep(),
      ]),
    RequestedInitPlainWithParentCommands: model =>
      Update.combineSteps(model, [
        PlainBinding.increment(),
        CompositionSafetyParentDefinition.makeNoopStep(),
      ]),
  })
export const reversedMixedConnectedUpdate =
  CompositionSafetyParentComposition.makeUpdate({
    CompletedParentInitialization: model =>
      Update.combineSteps(model, [
        CompositionSafetyParentDefinition.makeNoopStep(),
        PlainBinding.increment(),
      ]),
    RequestedInitEntry: model =>
      Update.combineSteps(model, [
        CompositionSafetyParentDefinition.makeNoopStep(),
        PlainBinding.increment(),
      ]),
    RequestedInitPlain: model =>
      Update.combineSteps(model, [
        CompositionSafetyParentDefinition.makeNoopStep(),
        PlainBinding.increment(),
      ]),
    RequestedInitPlainWithOwningParentCommand: model =>
      Update.combineSteps(model, [
        CompositionSafetyParentDefinition.makeNoopStep(),
        PlainBinding.increment(),
      ]),
    RequestedInitPlainWithParentCommands: model =>
      Update.combineSteps(model, [
        CompositionSafetyParentDefinition.makeNoopStep(),
        PlainBinding.increment(),
      ]),
  })
export const tupleMixedConnectedUpdate =
  CompositionSafetyParentComposition.makeUpdate({
    CompletedParentInitialization: model =>
      Update.combineSteps(model, mixedConnectedSteps),
    RequestedInitEntry: model =>
      Update.combineSteps(model, mixedConnectedSteps),
    RequestedInitPlain: model =>
      Update.combineSteps(model, mixedConnectedSteps),
    RequestedInitPlainWithOwningParentCommand: model =>
      Update.combineSteps(model, mixedConnectedSteps),
    RequestedInitPlainWithParentCommands: model =>
      Update.combineSteps(model, mixedConnectedSteps),
  })
export const deferredMixedConnectedUpdate =
  CompositionSafetyParentComposition.makeUpdate({
    CompletedParentInitialization: model => deferredMixedConnectedStep(model),
    RequestedInitEntry: model => deferredMixedConnectedStep(model),
    RequestedInitPlain: model => deferredMixedConnectedStep(model),
    RequestedInitPlainWithOwningParentCommand: model =>
      deferredMixedConnectedStep(model),
    RequestedInitPlainWithParentCommands: model =>
      deferredMixedConnectedStep(model),
  })
export const explicitGenericOrdinaryUpdate =
  CompositionSafetyParentComposition.makeUpdate({
    CompletedParentInitialization: model =>
      Update.combineSteps<typeof model, typeof ParentMessage.Type, never>(
        model,
        [stepModel => ({ model: stepModel })],
      ),
    RequestedInitEntry: model =>
      Update.combineSteps<typeof model, typeof ParentMessage.Type, never>(
        model,
        [stepModel => ({ model: stepModel })],
      ),
    RequestedInitPlain: model =>
      Update.combineSteps<typeof model, typeof ParentMessage.Type, never>(
        model,
        [stepModel => ({ model: stepModel })],
      ),
    RequestedInitPlainWithOwningParentCommand: model =>
      Update.combineSteps<typeof model, typeof ParentMessage.Type, never>(
        model,
        [stepModel => ({ model: stepModel })],
      ),
    RequestedInitPlainWithParentCommands: model =>
      Update.combineSteps<typeof model, typeof ParentMessage.Type, never>(
        model,
        [stepModel => ({ model: stepModel })],
      ),
  })
const parentCommandsStep = CompositionSafetyParentDefinition.makeCommandsStep(
  () => [CompleteParentInitialization()],
)
export const mixedConnectedCommandsStep = Update.combineSteps([
  PlainBinding.increment(),
  CompositionSafetyParentDefinition.makeNoopStep(),
  parentCommandsStep,
])
export const mixedConnectedCommandsUpdate =
  CompositionSafetyParentComposition.makeUpdate({
    CompletedParentInitialization: model => mixedConnectedCommandsStep(model),
    RequestedInitEntry: model => mixedConnectedCommandsStep(model),
    RequestedInitPlain: model => mixedConnectedCommandsStep(model),
    RequestedInitPlainWithOwningParentCommand: model =>
      mixedConnectedCommandsStep(model),
    RequestedInitPlainWithParentCommands: model =>
      mixedConnectedCommandsStep(model),
  })
export const pureMixedCommandsLast = Update.combineSteps(initialParentModel, [
  CompositionSafetyParentDefinition.makeNoopStep(),
  parentCommandsStep,
])
export const pureMixedCommandsFirst = Update.combineSteps(initialParentModel, [
  parentCommandsStep,
  CompositionSafetyParentDefinition.makeNoopStep(),
])

type MixedConnectedRecipeIsExact = Expect<
  Equal<
    ReturnType<typeof combinedMixedConnectedStep>,
    ReturnType<ReturnType<typeof PlainBinding.increment>>
  >
>
type DeferredMixedConnectedRecipeIsExact = Expect<
  Equal<
    ReturnType<typeof deferredMixedConnectedStep>,
    ReturnType<typeof combinedMixedConnectedStep>
  >
>
type MixedConnectedRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof mixedConnectedUpdate>>,
    | Block.RequirementOfBinding<typeof PlainBinding>
    | Block.RequirementOfBinding<typeof ParentCommandsBinding>
    | Block.RequirementOfBinding<typeof EntryBinding>
  >
>
type ReversedMixedConnectedResultIsExact = Expect<
  Equal<
    ReturnType<typeof reversedMixedConnectedUpdate>,
    ReturnType<typeof mixedConnectedUpdate>
  >
>
type TupleMixedConnectedResultIsExact = Expect<
  Equal<
    ReturnType<typeof tupleMixedConnectedUpdate>,
    ReturnType<typeof mixedConnectedUpdate>
  >
>
type DeferredMixedConnectedResultIsExact = Expect<
  Equal<
    ReturnType<typeof deferredMixedConnectedUpdate>,
    ReturnType<typeof mixedConnectedUpdate>
  >
>
type ExplicitGenericOrdinaryModelIsExact = Expect<
  Equal<
    ReturnType<typeof explicitGenericOrdinaryUpdate>['model'],
    typeof ParentModel.Type
  >
>
type ExplicitGenericOrdinaryRequirementsAreExact = Expect<
  Equal<Update.RequirementsOf<typeof explicitGenericOrdinaryUpdate>, never>
>
type MixedConnectedCommandsModelIsExact = Expect<
  Equal<
    RecipeModel<ReturnType<typeof mixedConnectedCommandsStep>>,
    typeof ParentModel.Type
  >
>
type MixedConnectedCommandsMessageIsExact = Expect<
  Equal<
    RecipeMessage<ReturnType<typeof mixedConnectedCommandsStep>>,
    | RecipeMessage<ReturnType<ReturnType<typeof PlainBinding.increment>>>
    | typeof ParentMessage.CompletedParentInitialization.Type
  >
>
type MixedConnectedCommandsRequirementsAreExact = Expect<
  EveryMemberEqual<
    Update.RequirementsOf<typeof mixedConnectedCommandsStep>,
    Command.HandlerOf<typeof CompleteParentInitialization>
  >
>
type MixedConnectedCommandsRegistrationIsExact = Expect<
  EveryMemberEqual<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof mixedConnectedCommandsStep>
    >,
    Block.RequirementOfBinding<typeof PlainBinding>
  >
>
type RegisteredMixedCommandsRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof mixedConnectedCommandsUpdate>,
    Command.HandlerOf<typeof CompleteParentInitialization>
  >
>
type PureMixedCommandsAreExact = Expect<
  Equal<
    typeof pureMixedCommandsLast,
    Update.Return<
      typeof ParentModel.Type,
      typeof ParentMessage.CompletedParentInitialization.Type,
      Command.HandlerOf<typeof CompleteParentInitialization>
    >
  >
>
type ReversedPureMixedCommandsAreExact = Expect<
  Equal<typeof pureMixedCommandsFirst, typeof pureMixedCommandsLast>
>

export const initDerivedModel = CompositionSafetyParentComposition.makeUpdate({
  CompletedParentInitialization: (model, _message) => {
    const nextModel = Struct.modifyFields(model, { route: () => 'Play' })
    return Update.combineSteps(nextModel, [
      initDerivedEntryStep,
      initPlainWithOwningParentCommandStep,
    ])
  },
  RequestedInitEntry: (model, _message) => {
    const nextModel = Struct.modifyFields(model, { route: () => 'Play' })
    return Update.combineSteps(nextModel, [
      initDerivedEntryStep,
      initPlainWithOwningParentCommandStep,
    ])
  },
  RequestedInitPlain: (model, _message) => {
    const nextModel = Struct.modifyFields(model, { route: () => 'Play' })
    return Update.combineSteps(nextModel, [
      initDerivedEntryStep,
      initPlainWithOwningParentCommandStep,
    ])
  },
  RequestedInitPlainWithOwningParentCommand: (model, _message) => {
    const nextModel = Struct.modifyFields(model, { route: () => 'Play' })
    return Update.combineSteps(nextModel, [
      initDerivedEntryStep,
      initPlainWithOwningParentCommandStep,
    ])
  },
  RequestedInitPlainWithParentCommands: (model, _message) => {
    const nextModel = Struct.modifyFields(model, { route: () => 'Play' })
    return Update.combineSteps(nextModel, [
      initDerivedEntryStep,
      initPlainWithOwningParentCommandStep,
    ])
  },
})
const prepareStrictBlock = () =>
  CompositionSafetyParentComposition.prepareBlock({
    init: CompositionSafetyParentComposition.makeInit(() => ({
      model: initialParentModel,
    })),
    update: CompositionSafetyParentComposition.makeUpdate({
      RequestedInitEntry: (model, { id, count }) =>
        initEntryStep(model, id, count),
      RequestedInitPlain: model => initPlainStep(model),
      RequestedInitPlainWithOwningParentCommand: model =>
        initPlainWithOwningParentCommandStep(model),
      RequestedInitPlainWithParentCommands: model =>
        initPlainWithParentCommandsStep(model),
      CompletedParentInitialization: model =>
        CompositionSafetyParentDefinition.makeNoopStep()(model),
    }),
    operations: {
      initEntry: (id: string, count: number) => [
        ParentMessage.RequestedInitEntry({ id, count }),
      ],
      initPlain: () => [ParentMessage.RequestedInitPlain()],
      initPlainWithOwningParentCommand: () => [
        ParentMessage.RequestedInitPlainWithOwningParentCommand(),
      ],
      initPlainWithParentCommands: () => [
        ParentMessage.RequestedInitPlainWithParentCommands(),
      ],
    },
    EffectsLayer: Layer.merge(
      LoadParameterizedChild.layer,
      CompleteParentInitialization.layer,
    ),
  })
export const StrictBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareStrictBlock
> = Block.assemble(prepareStrictBlock)

type EntryInitRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof initEntryStep>,
    Block.Qualify<'entries', Command.HandlerOf<typeof LoadParameterizedChild>>
  >
>
type ParentCommandRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof initPlainWithParentCommandsStep>,
    | Block.Qualify<'entries', Command.HandlerOf<typeof LoadParameterizedChild>>
    | Command.HandlerOf<typeof CompleteParentInitialization>
  >
>
type ParentCommandRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof initPlainWithParentCommandsStep>
    >,
    | Block.RequirementOfBinding<typeof ParentCommandsBinding>
    | Block.RequirementOfBinding<typeof EntryBinding>
  >
>
type EntryInitModelIsExact = Expect<
  Equal<RecipeModel<ReturnType<typeof initEntryStep>>, typeof ParentModel.Type>
>
type EntryInitMessageIsExact = Expect<
  Equal<
    RecipeMessage<ReturnType<typeof initEntryStep>>,
    typeof ParentMessage.Type
  >
>
type EntryInitRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initEntryStep>>,
    Block.RequirementOfBinding<typeof EntryBinding>
  >
>
type PlainInitRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initPlainStep>>,
    Block.RequirementOfBinding<typeof PlainBinding>
  >
>
type ParentCommandRecipeRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof makeParentCommandInitRecipe>,
    Command.HandlerOf<typeof CompleteParentInitialization>
  >
>
type ParentCommandRecipeRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof makeParentCommandInitRecipe>
    >,
    Block.RequirementOfBinding<typeof ParentCommandsBinding>
  >
>
type DerivedModelRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof initDerivedModel>,
    | Block.Qualify<'entries', Command.HandlerOf<typeof LoadParameterizedChild>>
    | Command.HandlerOf<typeof CompleteParentInitialization>
  >
>
type DerivedModelRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initDerivedStepsStep>>,
    | Block.RequirementOfBinding<typeof EntryBinding>
    | Block.RequirementOfBinding<typeof ParentCommandsBinding>
  >
>
export const init = CompositionSafetyParentDefinition.makeComposition({
  bindings: [StableProjectedBinding],
}).makeInit(() => ({
  model: {
    route: 'Home',
    second: ChildModel.make({ count: 0 }),
    plain: ChildModel.make({ count: 0 }),
    optionalContext: ChildModel.make({ count: 0 }),
    restContext: ChildModel.make({ count: 0 }),
    entries: [],
  },
}))

type EveryMemberEqualRejectsNever = Expect<
  Equal<
    EveryMemberEqual<
      never,
      Command.HandlerOf<typeof CompleteParentInitialization>
    >,
    false
  >
>

type EveryMemberEqualRejectsAny = Expect<
  Equal<
    EveryMemberEqual<
      any,
      Command.HandlerOf<typeof CompleteParentInitialization>
    >,
    false
  >
>

type EveryMemberEqualRejectsUnknown = Expect<
  Equal<
    EveryMemberEqual<
      unknown,
      Command.HandlerOf<typeof CompleteParentInitialization>
    >,
    false
  >
>

type EveryMemberEqualRejectsExtraRequirement = Expect<
  Equal<
    EveryMemberEqual<
      | Command.HandlerOf<typeof CompleteParentInitialization>
      | Command.HandlerOf<typeof LoadParameterizedChild>,
      Command.HandlerOf<typeof CompleteParentInitialization>
    >,
    false
  >
>

type EveryMemberEqualRejectsExtraRegistration = Expect<
  Equal<
    EveryMemberEqual<
      | Block.RequirementOfBinding<typeof PlainBinding>
      | Block.RequirementOfBinding<typeof EntryBinding>,
      Block.RequirementOfBinding<typeof PlainBinding>
    >,
    false
  >
>

export type CompositionSafetyAssertions = [
  EveryMemberEqualRejectsNever,
  EveryMemberEqualRejectsAny,
  EveryMemberEqualRejectsUnknown,
  EveryMemberEqualRejectsExtraRequirement,
  EveryMemberEqualRejectsExtraRegistration,

  MixedConnectedRecipeIsExact,
  DeferredMixedConnectedRecipeIsExact,
  MixedConnectedRegistrationIsExact,
  ReversedMixedConnectedResultIsExact,
  TupleMixedConnectedResultIsExact,
  DeferredMixedConnectedResultIsExact,
  ExplicitGenericOrdinaryModelIsExact,
  ExplicitGenericOrdinaryRequirementsAreExact,
  MixedConnectedCommandsModelIsExact,
  MixedConnectedCommandsMessageIsExact,
  MixedConnectedCommandsRequirementsAreExact,
  MixedConnectedCommandsRegistrationIsExact,
  RegisteredMixedCommandsRequirementsAreExact,
  PureMixedCommandsAreExact,
  ReversedPureMixedCommandsAreExact,
  EntryInitRequirementsAreExact,
  ParentCommandRequirementsAreExact,
  ParentCommandRegistrationIsExact,
  EntryInitModelIsExact,
  EntryInitMessageIsExact,
  EntryInitRegistrationIsExact,
  PlainInitRegistrationIsExact,
  ParentCommandRecipeRequirementsAreExact,
  ParentCommandRecipeRegistrationIsExact,
  DerivedModelRequirementsAreExact,
  DerivedModelRegistrationIsExact,
]

export const emptyPlainSteps = (model: ChildModel) =>
  Update.combineSteps(model, [])

export type EmptyPlainStepsAssertions = [
  Expect<
    Equal<ReturnType<typeof emptyPlainSteps>, Update.Return<ChildModel, never>>
  >,
  Expect<Equal<ReturnType<typeof emptyPlainSteps>['model'], ChildModel>>,
  Expect<Equal<Update.RequirementsOf<typeof emptyPlainSteps>, never>>,
  Expect<
    Equal<
      Update.RegistrationEvidenceOf<ReturnType<typeof emptyPlainSteps>>,
      never
    >
  >,
]
