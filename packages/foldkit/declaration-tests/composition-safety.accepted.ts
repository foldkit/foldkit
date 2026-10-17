import { Array, Effect, Layer, Option, Schema } from 'effect'
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

const CompositionSafetyPlain = Block.define('CompositionSafetyPlain', {
  Model: ChildModel,
  Message: ChildMessage,
})
const CompositionSafetyPlainComposition =
  CompositionSafetyPlain.makeComposition()
export const PlainBlock = CompositionSafetyPlainComposition.makeBlock({
  init: CompositionSafetyPlainComposition.makeInit(() => ({
    model: ChildModel.make({ count: 0 }),
  })),
  update: plainUpdate,
  EffectsLayer: Layer.empty,
})

const CompositionSafetyOptionalContext = Block.define(
  'CompositionSafetyOptionalContext',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
)
const CompositionSafetyOptionalContextComposition =
  CompositionSafetyOptionalContext.makeComposition()
export const OptionalContextBlock =
  CompositionSafetyOptionalContextComposition.makeBlock({
    init: CompositionSafetyOptionalContextComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
    })),
    update: optionalContextUpdate,
    EffectsLayer: Layer.empty,
  })

const CompositionSafetyRestContext = Block.define(
  'CompositionSafetyRestContext',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
)
const CompositionSafetyRestContextComposition =
  CompositionSafetyRestContext.makeComposition()
export const RestContextBlock =
  CompositionSafetyRestContextComposition.makeBlock({
    init: CompositionSafetyRestContextComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
    })),
    update: restContextUpdate,
    EffectsLayer: Layer.empty,
  })

export const ParameterizedChildModel = Schema.Struct({ count: Schema.Number })
export const ParameterizedChildMessage = Message.defineMessageUnion({
  CompletedLoad: {},
})
const CompositionSafetyParameterized = Block.define(
  'CompositionSafetyParameterized',
  {
    Model: ParameterizedChildModel,
    Message: ParameterizedChildMessage,
  },
)
export const LoadParameterizedChild = CompositionSafetyParameterized.command(
  'LoadParameterizedChild',
  {
    messages: [ParameterizedChildMessage.CompletedLoad],
    handler: function* () {
      return () => Effect.succeed(ParameterizedChildMessage.CompletedLoad())
    },
  },
)
const CompositionSafetyParameterizedComposition =
  CompositionSafetyParameterized.makeComposition()
export const ParameterizedBlock =
  CompositionSafetyParameterizedComposition.makeBlock({
    init: CompositionSafetyParameterizedComposition.makeInit(
      (count: number) => ({
        model: ParameterizedChildModel.make({ count }),
        commands: [LoadParameterizedChild()],
      }),
    ),
    update: CompositionSafetyParameterizedComposition.makeUpdate(model => ({
      model,
    })),
    EffectsLayer: LoadParameterizedChild.layer,
  })

export const Entry = Schema.Struct({
  id: Schema.String,
  child: ParameterizedChildModel,
})

export const ParentModel = Schema.Struct({
  first: ChildModel,
  second: ChildModel,
  plain: ChildModel,
  optionalContext: ChildModel,
  restContext: ChildModel,
  entries: Schema.Array(Entry),
})
export const ParentMessage = Message.defineMessageUnion({
  CompletedParentInitialization: {},
  RoutedProjectedMessage: { message: ChildMessage },
  RoutedPlainMessage: { message: ChildMessage },
  RoutedParentCommandMessage: { message: ChildMessage },
  RoutedOptionalContextMessage: { message: ChildMessage },
  RoutedRestContextMessage: { message: ChildMessage },
  RoutedEntryMessage: {
    id: Schema.String,
    message: ParameterizedChildMessage,
  },
})
export const CompositionSafetyParent = Block.define('CompositionSafetyParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
export const CompleteParentInitialization = CompositionSafetyParent.command(
  'CompleteParentInitialization',
  {
    messages: [ParentMessage.CompletedParentInitialization],
    handler: function* () {
      return () => Effect.succeed(ParentMessage.CompletedParentInitialization())
    },
  },
)

export const StableProjectedBinding = CompositionSafetyParent.bindChild(
  PlainBlock,
  {
    placement: 'stableProjected',
    read: model => Option.some(model.first),
    write: (model, nextChild) =>
      Struct.modifyFields(model, { first: () => nextChild }),
    parentMessage: ParentMessage.RoutedProjectedMessage,
    init: {
      args: () => [],
      model: child => ({ first: child }),
    },
  },
)
export const PlainBinding = CompositionSafetyParent.bindChild(PlainBlock, {
  field: 'plain',
  parentMessage: ParentMessage.RoutedPlainMessage,
  init: false,
})
export const ParentCommandsBinding = CompositionSafetyParent.bindChild(
  PlainBlock,
  {
    placement: 'parentCommands',
    read: model => Option.some(model.plain),
    write: (model, nextChild) =>
      Struct.modifyFields(model, { plain: () => nextChild }),
    toParentMessage: message =>
      ParentMessage.RoutedParentCommandMessage({ message }),
    fromParentMessage: false,
  },
)
export const OptionalContextBinding = CompositionSafetyParent.bindChild(
  OptionalContextBlock,
  {
    field: 'optionalContext',
    parentMessage: ParentMessage.RoutedOptionalContextMessage,
    fromParentMessage: {
      args: (_model, { message }) => Option.some([message]),
    },
  },
)
export const RestContextBinding = CompositionSafetyParent.bindChild(
  RestContextBlock,
  {
    field: 'restContext',
    parentMessage: ParentMessage.RoutedRestContextMessage,
    fromParentMessage: {
      args: (_model, { message }) => Option.some([message, { amount: 1 }]),
    },
  },
)
export const EntryBinding = CompositionSafetyParent.bindChild(
  ParameterizedBlock,
  {
    field: 'entries',
    key: 'id',
    childField: 'child',
    toParentMessage: (id, message) =>
      ParentMessage.RoutedEntryMessage({ id, message }),
    fromParentMessage: false,
  },
)

export const initialParentModel = ParentModel.make({
  first: ChildModel.make({ count: 0 }),
  second: ChildModel.make({ count: 0 }),
  plain: ChildModel.make({ count: 0 }),
  optionalContext: ChildModel.make({ count: 0 }),
  restContext: ChildModel.make({ count: 0 }),
  entries: [],
})

// eslint-disable-next-line foldkit/block-name-matches-variable
const foldComposition = CompositionSafetyParent.makeComposition({
  childBindings: [StableProjectedBinding, PlainBinding],
})
export const foldStableProjected = foldComposition.makeUpdate(
  (model, _message, childMessage: typeof ChildMessage.Type) =>
    StableProjectedBinding.fold(model, childMessage),
)
export const foldPlain = foldComposition.makeUpdate(
  (model, _message, childMessage: typeof ChildMessage.Type) =>
    PlainBinding.fold(model, childMessage),
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

export const initializePlain = CompositionSafetyParent.step(model =>
  PlainBinding.init({
    args: [],
    toParentModel: child => Struct.modifyFields(model, { plain: () => child }),
  }),
)
export const initializeEntry = CompositionSafetyParent.step(
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
const initializeParentCommandEntry = CompositionSafetyParent.step(model =>
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
const initializeParentCommandChild = CompositionSafetyParent.step(model =>
  ParentCommandsBinding.init({
    args: [],
    toParentModel: child => Struct.modifyFields(model, { plain: () => child }),
    commands: [CompleteParentInitialization()],
  }),
)
export const initializePlainWithParentCommands = Update.combine([
  initializeParentCommandEntry,
  initializeParentCommandChild,
])
export const makeParentCommandInitRecipe = () =>
  ParentCommandsBinding.init({
    args: [],
    toParentModel: child =>
      Struct.modifyFields(initialParentModel, { plain: () => child }),
    commands: [CompleteParentInitialization()],
  })
export const initializePlainWithOwningParentCommand =
  CompositionSafetyParent.step(model =>
    ParentCommandsBinding.init({
      args: [],
      toParentModel: child =>
        Struct.modifyFields(model, { plain: () => child }),
      commands: [CompleteParentInitialization()],
    }),
  )

export const CompositionSafetyParentComposition =
  CompositionSafetyParent.makeComposition({
    childBindings: [PlainBinding, ParentCommandsBinding, EntryBinding],
  })
export const StrictBlock = CompositionSafetyParentComposition.makeBlock({
  init: CompositionSafetyParentComposition.makeInit(() => ({
    model: initialParentModel,
  })),
  update: CompositionSafetyParentComposition.makeUpdate(model => ({ model })),
  expose: {
    initializeEntry,
    initializePlain,
    initializePlainWithOwningParentCommand,
    initializePlainWithParentCommands,
  },
  EffectsLayer: Layer.merge(
    LoadParameterizedChild.layer,
    CompleteParentInitialization.layer,
  ),
})

type EntryInitRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof initializeEntry>,
    Block.Qualify<'entries', Command.HandlerOf<typeof LoadParameterizedChild>>
  >
>
type ParentCommandRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof initializePlainWithParentCommands>,
    | Block.Qualify<'entries', Command.HandlerOf<typeof LoadParameterizedChild>>
    | Command.HandlerOf<typeof CompleteParentInitialization>
  >
>
type ParentCommandRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof initializePlainWithParentCommands>
    >,
    | Block.BindingRequirement<'parentCommands', typeof PlainBlock>
    | Block.BindingRequirement<'entries', typeof ParameterizedBlock>
  >
>
type EntryInitModelIsExact = Expect<
  Equal<
    ReturnType<typeof initializeEntry>,
    Update.ResultRecipe<
      typeof ParentModel.Type,
      typeof ParentMessage.Type,
      never,
      Block.Qualify<
        'entries',
        Command.HandlerOf<typeof LoadParameterizedChild>
      >,
      Block.BindingRequirement<'entries', typeof ParameterizedBlock>
    >
  >
>
type PlainInitRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initializePlain>>,
    Block.BindingRequirement<'plain', typeof PlainBlock>
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
    Block.BindingRequirement<'parentCommands', typeof PlainBlock>
  >
>

export const initialize = CompositionSafetyParent.makeComposition({
  childBindings: [StableProjectedBinding],
}).makeInit(() => ({
  model: {
    second: ChildModel.make({ count: 0 }),
    plain: ChildModel.make({ count: 0 }),
    optionalContext: ChildModel.make({ count: 0 }),
    restContext: ChildModel.make({ count: 0 }),
    entries: [],
  },
}))

export type CompositionSafetyAssertions = [
  EntryInitRequirementsAreExact,
  ParentCommandRequirementsAreExact,
  ParentCommandRegistrationIsExact,
  EntryInitModelIsExact,
  PlainInitRegistrationIsExact,
  ParentCommandRecipeRequirementsAreExact,
  ParentCommandRecipeRegistrationIsExact,
]
