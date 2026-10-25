import { Context, Effect, Schema, Tuple } from 'effect'
import { Block, Command, Message, Update } from 'foldkit'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const Model = Schema.Struct({ count: Schema.Number })
export const LocalMessage = Message.defineMessageUnion({
  RequestedQuiet: {},
  RequestedReport: { amount: Schema.Number },
  RequestedSave: {},
  CompletedSave: {},
})
export const OutMessage = Message.defineMessageUnion({
  ReportedCount: { count: Schema.Number },
})
export const CounterDefinition = Block.makeDefinition('RecordCounter', {
  Model,
  Message: LocalMessage,
  OutMessage,
})
export class Store extends Context.Service<
  Store,
  Readonly<{ save: Effect.Effect<void> }>
>()('RecordCounterStore') {}
export const Save = CounterDefinition.makeCommand('Save', {
  messages: [LocalMessage.CompletedSave],
  handler: function* () {
    const store = yield* Store
    return () => store.save.pipe(Effect.as(LocalMessage.CompletedSave()))
  },
})
export const CounterComposition = CounterDefinition.makeComposition()
export const init = CounterComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
export const update = CounterComposition.makeUpdate({
  RequestedQuiet: CounterDefinition.makeFieldsStep(() => ({
    count: count => count + 1,
  })),
  RequestedReport: CounterDefinition.makeOutMessageStep((model, message) =>
    OutMessage.ReportedCount({ count: model.count + message.amount }),
  ),
  RequestedSave: CounterDefinition.makeCommandsStep(() => [Save()]),
  CompletedSave: CounterDefinition.makeNoopStep(),
})
const prepareCounter = () =>
  CounterComposition.prepareBlock({
    init,
    update,
    operations: {
      quiet: LocalMessage.RequestedQuiet,
      report: LocalMessage.RequestedReport,
      save: LocalMessage.RequestedSave,
      reportAmount: (amount: number) =>
        Tuple.make(LocalMessage.RequestedReport({ amount })),
    },
    EffectsLayer: Save.layer,
  })
export const CounterBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareCounter
> = Block.assemble(prepareCounter)

const decoratedTupleOperation = Object.assign(
  (amount: number) => Tuple.make(LocalMessage.RequestedReport({ amount })),
  { ...CounterBlock.operations.quiet },
)
const decoratedConstructorOperation = Object.assign(
  LocalMessage.RequestedReport,
  { ...CounterBlock.operations.quiet },
)
const prepareDecoratedCounter = () =>
  CounterComposition.prepareBlock({
    init,
    update,
    operations: {
      reportTuple: decoratedTupleOperation,
      reportConstructor: decoratedConstructorOperation,
    },
    EffectsLayer: Save.layer,
  })
export const DecoratedCounterBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareDecoratedCounter
> = Block.assemble(prepareDecoratedCounter)
export type DecoratedTupleEmission = Expect<
  Equal<
    typeof DecoratedCounterBlock.operations.reportTuple extends Block.OperationEmission<true>
      ? true
      : false,
    true
  >
>
export type DecoratedConstructorEmission = Expect<
  Equal<
    typeof DecoratedCounterBlock.operations.reportConstructor extends Block.OperationEmission<true>
      ? true
      : false,
    true
  >
>

export const contextualUpdate = CounterComposition.makeUpdate.withContext(
  (multiplier: number) => ({
    RequestedQuiet: model => CounterDefinition.makeNoopStep()(model),
    RequestedReport: (model, { amount }) =>
      CounterDefinition.makeOutMessageStep(() =>
        OutMessage.ReportedCount({
          count: (model.count + amount) * multiplier,
        }),
      )(model),
    RequestedSave: model =>
      CounterDefinition.makeCommandsStep(() => [Save()])(model),
    CompletedSave: model => CounterDefinition.makeNoopStep()(model),
  }),
)
const prepareContextCounter = () =>
  CounterComposition.prepareBlock({
    init,
    update: contextualUpdate,
    operations: {
      report: LocalMessage.RequestedReport,
      reportAmount: (amount: number, multiplier: number) =>
        Tuple.make(LocalMessage.RequestedReport({ amount }), multiplier),
    },
    EffectsLayer: Save.layer,
  })
export const ContextCounterBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareContextCounter
> = Block.assemble(prepareContextCounter)

export const ParentModel = Schema.Struct({ child: Model, count: Schema.Number })
export const ParentMessage = Message.defineMessageUnion({
  RequestedQuiet: {},
  RequestedReport: {},
  RequestedSave: {},
  CompletedSave: {},
})
export const ParentDefinition = Block.makeDefinition('RecordParent', {
  Model: ParentModel,
  Message: ParentMessage,
  OutMessage,
})
export const ChildBinding = ParentDefinition.makeBinding(CounterBlock, {
  field: 'child',
}).withOutMessagePolicy({
  forward: ParentDefinition.makeOutMessageForward(CounterBlock, {
    ReportedCount: ({ count }) => OutMessage.ReportedCount({ count }),
  }),
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
export const parentUpdate = ParentComposition.makeUpdate({
  RequestedQuiet: model =>
    Update.combineSteps(model, [
      ChildBinding.quiet(),
      ParentDefinition.makeNoopStep(),
    ]),
  RequestedReport: model => ChildBinding.report({ amount: 1 })(model),
  RequestedSave: model => ChildBinding.save()(model),
  CompletedSave: ParentDefinition.makeNoopStep(),
})

export const makeGenericCounter = <Value>(Value: Schema.Schema<Value>) => {
  const GenericModel = Schema.Struct({ value: Value })
  const GenericMessage = Message.defineMessageUnion({
    RequestedQuiet: {},
    RequestedReport: { value: Value },
  })
  const GenericOutMessage = Message.defineMessageUnion({
    ReportedValue: { value: Value },
  })
  const GenericDefinition = Block.makeDefinition('RecordGeneric', {
    Model: GenericModel,
    Message: GenericMessage,
    OutMessage: GenericOutMessage,
  })
  const GenericComposition = GenericDefinition.makeComposition()
  const genericUpdate = GenericComposition.makeUpdate({
    RequestedQuiet: GenericDefinition.makeNoopStep(),
    RequestedReport: GenericDefinition.makeOutMessageStep.fromMessage(message =>
      GenericOutMessage.ReportedValue({ value: message.value }),
    ),
  })
  const prepare = () =>
    GenericComposition.prepareBlock({
      init: GenericComposition.makeInit((value: Value) => ({
        model: GenericModel.make({ value }),
      })),
      update: genericUpdate,
      operations: {
        quiet: GenericMessage.RequestedQuiet,
        report: GenericMessage.RequestedReport,
      },
    })
  const GenericBlock: Block.FromAssemblyWithOutMessage<
    typeof GenericModel,
    typeof prepare
  > = Block.assemble(prepare)
  return GenericBlock
}
export const StringCounterBlock = makeGenericCounter(Schema.String)

export type ExactRequirements = Expect<
  Equal<Update.RequirementsOf<typeof update>, Command.HandlerOf<typeof Save>>
>
export type ExactOutMessage = Expect<
  Equal<
    Exclude<ReturnType<typeof update>['outMessage'], undefined>,
    typeof OutMessage.Type
  >
>
export type QuietOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<typeof CounterBlock.operations.quiet>['outMessage'],
      undefined
    >,
    never
  >
>
export type QuietRequirements = Expect<
  Equal<Update.RequirementsOf<typeof CounterBlock.operations.quiet>, never>
>
export type ReportOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<typeof CounterBlock.operations.report>['outMessage'],
      undefined
    >,
    typeof OutMessage.Type
  >
>
export type TupleOutMessage = Expect<
  Equal<
    ReturnType<typeof CounterBlock.operations.reportAmount>,
    ReturnType<typeof CounterBlock.operations.report>
  >
>
export type SaveRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof CounterBlock.operations.save>,
    Command.HandlerOf<typeof Save>
  >
>
export type ContextParameters = Expect<
  Equal<
    Parameters<typeof contextualUpdate>,
    [
      model: typeof Model.Type,
      message: typeof LocalMessage.Type,
      multiplier: number,
    ]
  >
>
export type GenericOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<typeof StringCounterBlock.operations.report>['outMessage'],
      undefined
    >,
    { readonly _tag: 'ReportedValue'; readonly value: string }
  >
>

export const optionalContextUpdate = CounterComposition.makeUpdate.withContext(
  (multiplier?: number) => ({
    RequestedQuiet: model => CounterDefinition.makeNoopStep()(model),
    RequestedSave: model => CounterDefinition.makeNoopStep()(model),
    CompletedSave: model => CounterDefinition.makeNoopStep()(model),
    RequestedReport: (model, { amount }) =>
      CounterDefinition.makeOutMessageStep(() =>
        OutMessage.ReportedCount({ count: amount * (multiplier ?? 1) }),
      )(model),
  }),
)
export const defaultContextUpdate = CounterComposition.makeUpdate.withContext(
  (multiplier: number = 2) => ({
    RequestedQuiet: model => CounterDefinition.makeNoopStep()(model),
    RequestedSave: model => CounterDefinition.makeNoopStep()(model),
    CompletedSave: model => CounterDefinition.makeNoopStep()(model),
    RequestedReport: (model, { amount }) =>
      CounterDefinition.makeOutMessageStep(() =>
        OutMessage.ReportedCount({ count: amount * multiplier }),
      )(model),
  }),
)
export const restContextUpdate = CounterComposition.makeUpdate.withContext(
  (...multipliers: ReadonlyArray<number>) => ({
    RequestedQuiet: model => CounterDefinition.makeNoopStep()(model),
    RequestedSave: model => CounterDefinition.makeNoopStep()(model),
    CompletedSave: model => CounterDefinition.makeNoopStep()(model),
    RequestedReport: (model, { amount }) =>
      CounterDefinition.makeOutMessageStep(() =>
        OutMessage.ReportedCount({
          count: multipliers.reduce(
            (product, multiplier) => product * multiplier,
            amount,
          ),
        }),
      )(model),
  }),
)
export const requiredRestContextUpdate =
  CounterComposition.makeUpdate.withContext(
    (...[multiplier]: readonly [multiplier: number]) => ({
      RequestedQuiet: model => CounterDefinition.makeNoopStep()(model),
      RequestedSave: model => CounterDefinition.makeNoopStep()(model),
      CompletedSave: model => CounterDefinition.makeNoopStep()(model),
      RequestedReport: (model, { amount }) =>
        CounterDefinition.makeOutMessageStep(() =>
          OutMessage.ReportedCount({ count: amount * multiplier }),
        )(model),
    }),
  )

export type OptionalContextParameters = Expect<
  Equal<
    Parameters<typeof optionalContextUpdate>,
    [
      model: typeof Model.Type,
      message: typeof LocalMessage.Type,
      multiplier?: number | undefined,
    ]
  >
>
export type DefaultContextParameters = Expect<
  Equal<
    Parameters<typeof defaultContextUpdate>,
    [
      model: typeof Model.Type,
      message: typeof LocalMessage.Type,
      multiplier?: number | undefined,
    ]
  >
>
export type RestContextParameters = Expect<
  Equal<
    Parameters<typeof restContextUpdate>,
    [
      model: typeof Model.Type,
      message: typeof LocalMessage.Type,
      ...multipliers: ReadonlyArray<number>,
    ]
  >
>
export type RequiredRestContextParameters = Expect<
  Equal<
    Parameters<typeof requiredRestContextUpdate>,
    [
      model: typeof Model.Type,
      message: typeof LocalMessage.Type,
      multiplier: number,
    ]
  >
>

export const LargeContextMessage = Message.defineMessageUnion({
  PressedKey: { key: Schema.String },
  ChangedCount: { value: Schema.Number },
  BlurredInput: {},
  SubmittedSave: {},
  RequestedReport: { amount: Schema.Number },
  UpdatedRemote: {},
  FailedRemote: {},
  CompletedLoad: {},
  SucceededFetch: {},
  FailedFetch: {},
  ClickedCopy: {},
  SucceededCopy: {},
  CompletedWait: {},
  InformedJoin: {},
  SucceededJoin: {},
  CompletedSave: {},
})
export const LargeContextDefinition = Block.makeDefinition(
  'RecordLargeContext',
  {
    Model,
    Message: LargeContextMessage,
    OutMessage,
  },
)
export const LargeSave = LargeContextDefinition.makeCommand('LargeSave', {
  messages: [LargeContextMessage.CompletedSave],
  handler: function* () {
    return () => Effect.succeed(LargeContextMessage.CompletedSave())
  },
})
export const LargeContextComposition = LargeContextDefinition.makeComposition()
export type LargeContext = Readonly<{
  increment: number
  label: string
}>
export const largeContextUpdate =
  LargeContextComposition.makeUpdate.withContext((context: LargeContext) => ({
    PressedKey: model => ({ model }),
    ChangedCount: LargeContextDefinition.makeFieldsStep.fromMessage(
      ({ value }) => ({ count: () => value }),
    ),
    BlurredInput: LargeContextDefinition.makeCommandsStep(() => [LargeSave()]),
    SubmittedSave: model =>
      Update.combineSteps([
        LargeContextDefinition.makeFieldsStep(() => ({
          count: count => count + context.increment,
        })),
        LargeContextDefinition.makeCommandsStep(() => [LargeSave()]),
      ])(model),
    RequestedReport: LargeContextDefinition.makeOutMessageStep.fromMessage(
      ({ amount }) => OutMessage.ReportedCount({ count: amount }),
    ),
    UpdatedRemote: LargeContextDefinition.makeNoopStep(),
    FailedRemote: LargeContextDefinition.makeFieldsStep(() => ({
      count: () => context.increment,
    })),
    CompletedLoad: model => ({ model }),
    SucceededFetch: LargeContextDefinition.makeNoopStep(),
    FailedFetch: model => ({ model }),
    ClickedCopy: LargeContextDefinition.makeCommandsStep(() => [LargeSave()]),
    SucceededCopy: LargeContextDefinition.makeFieldsStep(() => ({
      count: count => count + context.label.length,
    })),
    CompletedWait: LargeContextDefinition.makeNoopStep(),
    InformedJoin: model => ({ model }),
    SucceededJoin: LargeContextDefinition.makeNoopStep(),
    CompletedSave: LargeContextDefinition.makeNoopStep(),
  }))
const prepareLargeContextBlock = () =>
  LargeContextComposition.prepareBlock({
    init: LargeContextComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update: largeContextUpdate,
    operations: {
      report: LargeContextMessage.RequestedReport,
      submit: LargeContextMessage.SubmittedSave,
    },
    EffectsLayer: LargeSave.layer,
  })
export const LargeContextBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareLargeContextBlock
> = Block.assemble(prepareLargeContextBlock)

export type LargeContextParameters = Expect<
  Equal<
    Parameters<typeof largeContextUpdate>,
    [
      model: typeof Model.Type,
      message: typeof LargeContextMessage.Type,
      context: LargeContext,
    ]
  >
>
export type LargeSubmittedRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof LargeContextBlock.operations.submit>,
    Command.HandlerOf<typeof LargeSave>
  >
>
export type LargeReportedOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<typeof LargeContextBlock.operations.report>['outMessage'],
      undefined
    >,
    typeof OutMessage.Type
  >
>
