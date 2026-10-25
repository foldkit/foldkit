import { Context, Effect, Layer, Option, Schema } from 'effect'
import { Program } from 'foldkit'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { type Program as ProgramType } from 'foldkit/program'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

type Expect<Value extends true> = Value

class SaveClient extends Context.Service<
  SaveClient,
  Readonly<{ save: Effect.Effect<void> }>
>()('DualUpdatePrototype/SaveClient') {}

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ChangedCount: { amount: Schema.Number },
  CompletedSave: {},
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  ReportedCount: { count: Schema.Number },
  RequestedReset: {},
  ObservedSave: {},
})
type OutMessage = typeof OutMessage.Type
type ReportedCountOutMessage = ReturnType<typeof OutMessage.ReportedCount>

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const CounterDefinition = Block.makeDefinition('DualUpdatePrototypeCounter', {
  Model,
  Message,
  OutMessage,
})

const Save = CounterDefinition.makeCommand('Save', {
  messages: [Message.CompletedSave],
})

const SaveLayer = Save.toLayer<never, 'SaveConstructorUnavailable', SaveClient>(
  Effect.gen(function* () {
    yield* SaveClient
    return yield* Effect.fail<'SaveConstructorUnavailable'>(
      'SaveConstructorUnavailable',
    )
  }),
)

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const CounterComposition = CounterDefinition.makeComposition()
const update = CounterComposition.makeUpdate({
  ChangedCount: (
    model,
    { amount },
  ): Update.Return<Model, Message, Command.HandlerOf<typeof Save>> => ({
    model: modifyFields(model, { count: count => count + amount }),
    commands: [Save()],
  }),
  CompletedSave: (
    model,
  ): Update.Return<Model, Message, Command.HandlerOf<typeof Save>> => ({
    model,
  }),
})

const reportUpdate = CounterComposition.makeUpdate({
  ChangedCount: (
    model,
    { amount },
  ): Update.ReturnWithOutMessage<Model, Message, OutMessage> => ({
    model,
    outMessage: OutMessage.ReportedCount({ count: model.count + amount }),
  }),
  CompletedSave: (
    model,
  ): Update.ReturnWithOutMessage<Model, Message, OutMessage> => ({
    model,
    outMessage: OutMessage.ObservedSave(),
  }),
})

const ternaryUpdate = CounterComposition.makeUpdate({
  ChangedCount: model => ({
    model,
    commands: [Save()],
    outMessage: OutMessage.ReportedCount({ count: model.count }),
  }),
  CompletedSave: model => ({ model }),
})
const earlyReturnUpdate = CounterComposition.makeUpdate({
  ChangedCount: model => ({
    model,
    commands: [Save()],
    outMessage: OutMessage.ReportedCount({ count: model.count }),
  }),
  CompletedSave: model => ({ model }),
})

type TernaryReturn = Expect<
  Equal<
    ReturnType<typeof ternaryUpdate>,
    Update.ReturnWithOutMessage<
      Model,
      Message,
      ReportedCountOutMessage,
      Command.HandlerOf<typeof Save>
    >
  >
>
type EarlyReturn = Expect<
  Equal<ReturnType<typeof earlyReturnUpdate>, ReturnType<typeof ternaryUpdate>>
>
type TernaryRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof ternaryUpdate>,
    Command.HandlerOf<typeof Save>
  >
>
type EarlyReturnRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof earlyReturnUpdate>,
    Command.HandlerOf<typeof Save>
  >
>

type CanonicalParameters = Expect<
  Equal<Parameters<typeof update>, [model: Model, message: Message]>
>
type CanonicalReturn = Expect<
  Equal<
    ReturnType<typeof update>,
    Update.Return<Model, Message, Command.HandlerOf<typeof Save>>
  >
>
type OutMessageReturn = Expect<
  Equal<
    ReturnType<typeof reportUpdate>,
    Update.ReturnWithOutMessage<Model, Message, OutMessage>
  >
>

const changedCount = Message.ChangedCount({ amount: 2 })
const changedCountStep = update(changedCount)

type CurriedStepParameters = Expect<
  Equal<Parameters<typeof changedCountStep>, [model: Model]>
>
type CurriedStepReturn = Expect<
  Equal<ReturnType<typeof changedCountStep>, ReturnType<typeof update>>
>

const prepareCounterBlock = () =>
  CounterComposition.prepareBlock({
    init: CounterComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update,
    EffectsLayer: SaveLayer,
  })
const CounterBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareCounterBlock
> = Block.assemble(prepareCounterBlock)
const prepareTernaryBlock = () =>
  CounterComposition.prepareBlock({
    init: CounterComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update: ternaryUpdate,
    EffectsLayer: SaveLayer,
  })
const TernaryBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareTernaryBlock
> = Block.assemble(prepareTernaryBlock)
const prepareEarlyReturnBlock = () =>
  CounterComposition.prepareBlock({
    init: CounterComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update: earlyReturnUpdate,
    EffectsLayer: SaveLayer,
  })
const EarlyReturnBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareEarlyReturnBlock
> = Block.assemble(prepareEarlyReturnBlock)
const plainUpdate = (model: Model, _message: Message) => ({ model })
const preparePlainUpdateBlock = () =>
  CounterComposition.prepareBlock({
    init: CounterComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update: plainUpdate,
  })
const PlainUpdateBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof preparePlainUpdateBlock
> = Block.assemble(preparePlainUpdateBlock)
function handAuthoredDualUpdate(
  message: Message,
): (model: Model) => Readonly<{ model: Model; audit: 'preserved' }>
function handAuthoredDualUpdate(
  model: Model,
  message: Message,
): Readonly<{ model: Model; audit: 'preserved' }>
function handAuthoredDualUpdate(
  modelOrMessage: Model | Message,
  message?: Message,
):
  | Readonly<{ model: Model; audit: 'preserved' }>
  | ((model: Model) => Readonly<{ model: Model; audit: 'preserved' }>) {
  if (message !== undefined && 'count' in modelOrMessage) {
    return { model: modelOrMessage, audit: 'preserved' }
  }

  return (model: Model) => ({ model, audit: 'preserved' })
}
const prepareHandAuthoredDualBlock = () =>
  CounterComposition.prepareBlock({
    init: CounterComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update: handAuthoredDualUpdate,
  })
const HandAuthoredDualBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareHandAuthoredDualBlock
> = Block.assemble(prepareHandAuthoredDualBlock)

type PlainUpdateRemainsPlain = Expect<
  Equal<typeof PlainUpdateBlock.update, typeof plainUpdate>
>
type HandAuthoredDualRemainsExact = Expect<
  Equal<typeof HandAuthoredDualBlock.update, typeof handAuthoredDualUpdate>
>
type HandAuthoredDualReturn = Expect<
  Equal<
    ReturnType<typeof HandAuthoredDualBlock.update>,
    Readonly<{ model: Model; audit: 'preserved' }>
  >
>

type ConstructorError = Expect<
  Equal<
    Layer.Error<typeof CounterBlock.EffectsLayer>,
    'SaveConstructorUnavailable'
  >
>
type ConstructorService = Expect<
  Equal<Layer.Services<typeof CounterBlock.EffectsLayer>, SaveClient>
>
type UpdateRequirements = Expect<
  Equal<Update.RequirementsOf<typeof update>, Command.HandlerOf<typeof Save>>
>

const incrementAgain = CounterDefinition.makeStep((model, amount: number) => ({
  model: modifyFields(model, { count: count => count + amount }),
}))

const combined = Update.combineSteps(Model.make({ count: 0 }), [
  changedCountStep,
  stepModel => incrementAgain(stepModel, 3),
])

const combineGenericSteps = <Model, Message, R>(
  model: Model,
  steps: ReadonlyArray<Update.Step<Model, Message, R>>,
) => Update.combineSteps<Model, Message, R>(model, steps)

type CombinedModel = Expect<Equal<typeof combined.model, Model>>

type DispatchContext = Readonly<{ multiplier: number }>

const fullChannelUpdate = CounterComposition.makeUpdate.withContext(
  (context: DispatchContext) => ({
    CompletedSave: model => ({
      model,
      commands: [Save()],
      outMessage: OutMessage.ReportedCount({ count: model.count }),
    }),
    ChangedCount: (model, message) => ({
      model: modifyFields(model, {
        count: count => count + message.amount * context.multiplier,
      }),
      commands: [Save()],
      outMessage: OutMessage.ReportedCount({ count: model.count }),
    }),
  }),
)
const prepareFullChannelBlock = () =>
  CounterComposition.prepareBlock({
    init: CounterComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update: fullChannelUpdate,
    EffectsLayer: SaveLayer,
  })
const FullChannelBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareFullChannelBlock
> = Block.assemble(prepareFullChannelBlock)
const fullChannelStep = FullChannelBlock.update(changedCount)

type FullChannelParameters = Expect<
  Equal<
    Parameters<typeof FullChannelBlock.update>,
    [model: Model, message: Message, context: DispatchContext]
  >
>
type FullChannelStepParameters = Expect<
  Equal<
    Parameters<typeof fullChannelStep>,
    [model: Model, context: DispatchContext]
  >
>
type FullChannelReturn = Expect<
  Equal<
    ReturnType<typeof FullChannelBlock.update>,
    Update.ReturnWithOutMessage<
      Model,
      Message,
      ReportedCountOutMessage,
      Command.HandlerOf<typeof Save>
    >
  >
>

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const ContextualComposition = Block.makeDefinition(
  'DualUpdatePrototypeContextualCounter',
  {
    Model,
    Message,
  },
).makeComposition()

const requiredContextUpdate = ContextualComposition.makeUpdate.withContext(
  (context: DispatchContext) => ({
    CompletedSave: model => ({ model }),
    ChangedCount: (model, message) => ({
      model: modifyFields(model, {
        count: count => count + message.amount * context.multiplier,
      }),
    }),
  }),
)

type RequiredCanonicalParameters = Expect<
  Equal<
    Parameters<typeof requiredContextUpdate>,
    [model: Model, message: Message, context: DispatchContext]
  >
>

const requiredContextStep = requiredContextUpdate(changedCount)

type RequiredCurriedParameters = Expect<
  Equal<
    Parameters<typeof requiredContextStep>,
    [model: Model, context: DispatchContext]
  >
>

const requiredCombined = Update.combineSteps(Model.make({ count: 0 }), [
  stepModel =>
    requiredContextUpdate(changedCount)(stepModel, { multiplier: 2 }),
  stepModel => incrementAgain(stepModel, 1),
])

const optionalContextUpdate = ContextualComposition.makeUpdate.withContext(
  (context?: DispatchContext) => ({
    CompletedSave: (model, _message) => ({
      model: modifyFields(model, {
        count: count => count + (context?.multiplier ?? 1),
      }),
    }),
    ChangedCount: (model, _message) => ({
      model: modifyFields(model, {
        count: count => count + (context?.multiplier ?? 1),
      }),
    }),
  }),
)

const defaultContextUpdate = ContextualComposition.makeUpdate.withContext(
  (context: DispatchContext = { multiplier: 1 }) => ({
    CompletedSave: (model, _message) => ({
      model: modifyFields(model, {
        count: count => count + context.multiplier,
      }),
    }),
    ChangedCount: (model, _message) => ({
      model: modifyFields(model, {
        count: count => count + context.multiplier,
      }),
    }),
  }),
)

const restContextUpdate = ContextualComposition.makeUpdate.withContext(
  (...contexts: ReadonlyArray<DispatchContext>) => ({
    CompletedSave: (model, _message) => ({
      model: modifyFields(model, {
        count: count =>
          count +
          contexts.reduce((total, context) => total + context.multiplier, 0),
      }),
    }),
    ChangedCount: (model, _message) => ({
      model: modifyFields(model, {
        count: count =>
          count +
          contexts.reduce((total, context) => total + context.multiplier, 0),
      }),
    }),
  }),
)

const testView = (model: Model, h: HtmlBuilder<Message>) =>
  h.button(
    [h.OnClick(changedCount), h.Type('button')],
    [globalThis.String(model.count)],
  )

Story.story(
  reportUpdate,
  Story.given(Model.make({ count: 0 })),
  Story.message(changedCount),
  Story.expectOutMessage(OutMessage.ReportedCount({ count: 2 })),
)
Scene.scene(
  { update: reportUpdate, view: testView },
  Scene.given(Model.make({ count: 0 })),
  Scene.click(Scene.role('button')),
  Scene.expectOutMessage(OutMessage.ReportedCount({ count: 2 })),
)
Story.story(
  optionalContextUpdate,
  Story.given(Model.make({ count: 0 })),
  Story.message(changedCount),
)
Story.story(
  defaultContextUpdate,
  Story.given(Model.make({ count: 0 })),
  Story.message(changedCount),
)
Story.story(
  restContextUpdate,
  Story.given(Model.make({ count: 0 })),
  Story.message(changedCount),
)

const requiredRestContextUpdate = ContextualComposition.makeUpdate.withContext(
  (
    ...contexts: readonly [DispatchContext, ...ReadonlyArray<DispatchContext>]
  ) => ({
    CompletedSave: model => ({
      model: modifyFields(model, {
        count: count =>
          count +
          contexts.reduce((total, context) => total + context.multiplier, 0),
      }),
    }),
    ChangedCount: (model, message) => ({
      model: modifyFields(model, {
        count: count =>
          count +
          message.amount +
          contexts.reduce((total, context) => total + context.multiplier, 0),
      }),
    }),
  }),
)

Update.combineSteps(Model.make({ count: 0 }), [
  optionalContextUpdate(changedCount),
])
Update.combineSteps(Model.make({ count: 0 }), [
  defaultContextUpdate(changedCount),
])
Update.combineSteps(Model.make({ count: 0 }), [restContextUpdate(changedCount)])

requiredRestContextUpdate(changedCount)(Model.make({ count: 0 }), {
  multiplier: 2,
})

const prepareRequiredRestBlock = () =>
  ContextualComposition.prepareBlock({
    init: ContextualComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update: requiredRestContextUpdate,
  })
const RequiredRestBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareRequiredRestBlock
> = Block.assemble(prepareRequiredRestBlock)
const RequiredRestParentModel = Schema.Struct({ child: Model })
const RequiredRestParentMessage = defineMessageUnion({
  ClickedParent: {},
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const RequiredRestParentDefinition = Block.makeDefinition(
  'DualUpdateRequiredRestParent',
  {
    Model: RequiredRestParentModel,
    Message: RequiredRestParentMessage,
  },
)

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  ChangedCount: { amount: Schema.Number },
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const ChildComposition = Block.makeDefinition('DualUpdatePrototypeChild', {
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
    })),
    update: ChildComposition.makeUpdate({
      ChangedCount: (model, message) => ({
        model: modifyFields(model, {
          count: count => count + message.amount,
        }),
      }),
    }),
    operations: { requestChangeCount: ChildMessage.ChangedCount },
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const GraphFullModel = Schema.Struct({
  child: ChildModel,
  count: Schema.Number,
})
type GraphFullModel = typeof GraphFullModel.Type
const GraphFullMessage = defineMessageUnion({
  ChangedCount: { amount: Schema.Number },
  CompletedSave: {},
  IgnoredRequest: {},
})
const GraphFullOutMessage = defineMessageUnion({
  ReportedCount: { count: Schema.Number },
})
type GraphFullOutMessage = typeof GraphFullOutMessage.Type
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const GraphFullDefinition = Block.makeDefinition('DualUpdateGraphFull', {
  Model: GraphFullModel,
  Message: GraphFullMessage,
  OutMessage: GraphFullOutMessage,
})
// oxlint-disable-next-line foldkit/command-binding-matches-name -- This fixture distinguishes this Command from another owner with the same local name.
const GraphFullSave = GraphFullDefinition.makeCommand('Save', {
  messages: [GraphFullMessage.CompletedSave],
})
const GraphFullSaveLayer = GraphFullSave.toLayer<
  never,
  'GraphFullSaveUnavailable',
  SaveClient
>(
  Effect.gen(function* () {
    yield* SaveClient
    return yield* Effect.fail<'GraphFullSaveUnavailable'>(
      'GraphFullSaveUnavailable',
    )
  }),
)
const GraphFullChildBinding = GraphFullDefinition.makeBinding(ChildBlock, {
  field: 'child',
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const GraphFullComposition = GraphFullDefinition.makeComposition({
  bindings: [GraphFullChildBinding],
})
const saveGraphFull = GraphFullDefinition.makeStep(
  (model, context: DispatchContext) => {
    const nextModel = modifyFields(model, {
      count: count => count + context.multiplier,
    })

    return {
      model: nextModel,
      commands: [GraphFullSave()],
      outMessage: GraphFullOutMessage.ReportedCount({
        count: nextModel.count,
      }),
    }
  },
)
const ignoreGraphFullRequest = GraphFullDefinition.makeNoopStep()
const graphFullUpdate = GraphFullComposition.makeUpdate.withContext(
  (context: DispatchContext) => ({
    ChangedCount: (model, { amount }) =>
      GraphFullChildBinding.requestChangeCount({ amount })(model),
    CompletedSave: model => saveGraphFull(model, context),
    IgnoredRequest: model => ignoreGraphFullRequest(model),
  }),
)
const prepareGraphFullBlock = () =>
  GraphFullComposition.prepareBlock({
    init: GraphFullComposition.makeInit(() => ({
      model: { count: 0 },
    })),
    update: graphFullUpdate,
    EffectsLayer: GraphFullSaveLayer,
  })
const GraphFullBlock: Block.FromAssemblyWithOutMessage<
  typeof GraphFullModel,
  typeof prepareGraphFullBlock
> = Block.assemble(prepareGraphFullBlock)
const graphFullMessage = GraphFullMessage.ChangedCount({ amount: 2 })
const graphFullStep = GraphFullBlock.update(graphFullMessage)

type GraphFullAuthoredRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof graphFullUpdate>>,
    Block.RequirementOfBinding<typeof GraphFullChildBinding>
  >
>
type GraphFullCompletedRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof GraphFullBlock.update>>,
    never
  >
>
type GraphFullParameters = Expect<
  Equal<
    Parameters<typeof GraphFullBlock.update>,
    [
      model: GraphFullModel,
      message: typeof GraphFullComposition.Message.Type,
      context: DispatchContext,
    ]
  >
>
type GraphFullStepParameters = Expect<
  Equal<
    Parameters<typeof graphFullStep>,
    [model: GraphFullModel, context: DispatchContext]
  >
>
type GraphFullReturn = Expect<
  Equal<
    ReturnType<typeof GraphFullBlock.update>,
    Update.ReturnWithOutMessage<
      GraphFullModel,
      typeof GraphFullComposition.Message.Type,
      ReturnType<typeof GraphFullOutMessage.ReportedCount>,
      Command.HandlerOf<typeof GraphFullSave>
    >
  >
>
type GraphFullConstructorError = Expect<
  Equal<
    Layer.Error<typeof GraphFullBlock.EffectsLayer>,
    'GraphFullSaveUnavailable'
  >
>
type GraphFullConstructorService = Expect<
  Equal<Layer.Services<typeof GraphFullBlock.EffectsLayer>, SaveClient>
>

const ParentModel = Schema.Struct({ child: ChildModel, updates: Schema.Number })
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({
  ChangedLabel: { label: Schema.Literals(['Primary', 'Secondary']) },
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const ParentDefinition = Block.makeDefinition('DualUpdatePrototypeParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
const parentUpdate = ParentComposition.makeUpdate({
  ChangedLabel: (model, message) => {
    type RefinedMessage = Expect<
      Equal<typeof message, ReturnType<typeof ParentMessage.ChangedLabel>>
    >
    const refinedMessageProof: RefinedMessage = true
    void refinedMessageProof
    return { model }
  },
})
const parentModel = ParentModel.make({
  child: ChildModel.make({ count: 0 }),
  updates: 0,
})
const parentMessage = ParentMessage.ChangedLabel({ label: 'Primary' })
const countParentUpdate = ParentDefinition.makeStep(model => ({
  model: modifyFields(model, { updates: updates => updates + 1 }),
}))

const graphCombined = Update.combineSteps(parentModel, [
  parentUpdate(parentMessage),
  countParentUpdate,
])

const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    init: ParentComposition.makeInit(() => ({ model: { updates: 0 } })),
    update: parentUpdate,
  })
const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)
const completedParentStep = ParentBlock.update(parentMessage)
const completedGraphCombined = Update.combineSteps(parentModel, [
  completedParentStep,
  countParentUpdate,
])

type CompletedParentParameters = Expect<
  Equal<
    Parameters<typeof ParentBlock.update>,
    [model: ParentModel, message: typeof ParentComposition.Message.Type]
  >
>
type CompletedParentStepParameters = Expect<
  Equal<Parameters<typeof completedParentStep>, [model: ParentModel]>
>
type CompletedRegistrationIsInstalled = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof ParentBlock.update>>,
    never
  >
>

type GraphRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof parentUpdate>>,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>
type GraphCombinedRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<typeof graphCombined>,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const RootApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const Persist = RootApplicationDefinition.makeCommand('Persist', {
  messages: [Message.CompletedSave],
})
const PersistLayer = Persist.toLayer<
  never,
  'PersistConstructorUnavailable',
  SaveClient
>(
  Effect.gen(function* () {
    yield* SaveClient
    return yield* Effect.fail<'PersistConstructorUnavailable'>(
      'PersistConstructorUnavailable',
    )
  }),
)
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const RootComposition = RootApplicationDefinition.makeComposition()
const rootInit = RootComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const rootUpdate = RootComposition.makeUpdate({
  CompletedSave: model => ({ model }),
  ChangedCount: model => ({ model, commands: [Persist()] }),
})
const rootView = RootComposition.makeView((model, h) => ({
  title: globalThis.String(model.count),
  body: h.empty,
}))

const prepare = () =>
  RootComposition.prepareBlock({
    init: rootInit,
    update: rootUpdate,
    view: rootView,
    EffectsLayer: PersistLayer,
  })
const completedBlock: Block.FromAssemblyWithView<typeof Model, typeof prepare> =
  Block.assemble(prepare)
const makePendingApplication = () =>
  Program.make({
    block: completedBlock,
    container: document.body,
  })

if (false) {
  const typedPendingApplication: ProgramType<
    undefined,
    void,
    SaveClient,
    never,
    Command.HandlerOf<typeof Persist>
  > = makePendingApplication()

  void typedPendingApplication
}

type PersistConstructorError = Expect<
  Equal<Layer.Error<typeof PersistLayer>, 'PersistConstructorUnavailable'>
>
type PersistConstructorService = Expect<
  Equal<Layer.Services<typeof PersistLayer>, SaveClient>
>

const OverlappingValue = Schema.TaggedStruct('Changed', {
  amount: Schema.Number,
})
const overlappingValue = OverlappingValue.make({ amount: 1 })
type OverlappingModel = typeof overlappingValue
type OverlappingMessage = typeof overlappingValue
type OverlappingContext = typeof overlappingValue

declare const overlappingUpdate: {
  (
    message: OverlappingMessage,
  ): (
    model: OverlappingModel,
    context: OverlappingContext,
  ) => Update.Return<OverlappingModel, OverlappingMessage>
  (
    model: OverlappingModel,
    message: OverlappingMessage,
    context: OverlappingContext,
  ): Update.Return<OverlappingModel, OverlappingMessage>
}

if (false) {
  overlappingUpdate(overlappingValue)(overlappingValue, overlappingValue)
}

void combined
void requiredCombined
void graphCombined
void completedGraphCombined
void Option.none()

export {
  ChildBlock,
  CounterComposition,
  EarlyReturnBlock,
  Model,
  Message,
  OutMessage,
  Save,
  TernaryBlock,
  changedCount,
  combined,
  combineGenericSteps,
  completedGraphCombined,
  completedParentStep,
  defaultContextUpdate,
  earlyReturnUpdate,
  FullChannelBlock,
  fullChannelStep,
  graphCombined,
  GraphFullBlock,
  GraphFullChildBinding,
  GraphFullComposition,
  GraphFullModel,
  GraphFullMessage,
  GraphFullOutMessage,
  GraphFullSave,
  graphFullMessage,
  graphFullStep,
  graphFullUpdate,
  optionalContextUpdate,
  parentModel,
  parentMessage,
  parentUpdate,
  ParentBlock,
  ParentDefinition,
  ParentMessage,
  ParentComposition,
  PersistLayer,
  makePendingApplication,
  RequiredRestBlock,
  RequiredRestParentDefinition,
  RequiredRestParentMessage,
  RequiredRestParentModel,
  rootInit,
  RootComposition,
  rootUpdate,
  rootView,
  SaveClient,
  reportUpdate,
  requiredCombined,
  requiredContextUpdate,
  requiredRestContextUpdate,
  restContextUpdate,
  ternaryUpdate,
  update,
}

export type Assertions = [
  CanonicalParameters,
  CanonicalReturn,
  OutMessageReturn,
  TernaryReturn,
  EarlyReturn,
  TernaryRequirements,
  EarlyReturnRequirements,
  CurriedStepParameters,
  CurriedStepReturn,
  ConstructorError,
  ConstructorService,
  UpdateRequirements,
  PlainUpdateRemainsPlain,
  HandAuthoredDualRemainsExact,
  HandAuthoredDualReturn,
  CombinedModel,
  RequiredCanonicalParameters,
  RequiredCurriedParameters,
  GraphFullAuthoredRegistration,
  GraphFullCompletedRegistration,
  GraphFullParameters,
  GraphFullStepParameters,
  GraphFullReturn,
  GraphFullConstructorError,
  GraphFullConstructorService,
  FullChannelParameters,
  FullChannelStepParameters,
  FullChannelReturn,
  GraphRegistration,
  GraphCombinedRegistration,
  CompletedParentParameters,
  CompletedParentStepParameters,
  CompletedRegistrationIsInstalled,
  PersistConstructorError,
  PersistConstructorService,
]
