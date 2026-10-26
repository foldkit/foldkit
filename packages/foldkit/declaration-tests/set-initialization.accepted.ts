import { Context, Effect, Option, Schema, Tuple } from 'effect'
import { Block, Message, Struct, Update } from 'foldkit'
import { initAndSet } from 'foldkit/bindingInit'

export class ReadService extends Context.Service<
  ReadService,
  Readonly<{ read: Effect.Effect<number> }>
>()('SetReadService') {}

export const ChildModel = Schema.Struct({
  count: Schema.Number,
  labels: Schema.Array(Schema.String),
})
const ChildMessage = Message.defineMessageUnion({
  CompletedRead: { count: Schema.Number },
})
const ChildOutMessage = Message.defineMessageUnion({
  ChangedCount: { count: Schema.Number },
})
const ChildDefinition = Block.makeDefinition('DeclarationSetChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
export const Read = ChildDefinition.makeCommand('Read', {
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    const service = yield* ReadService
    return () =>
      Effect.map(service.read, count => ChildMessage.CompletedRead({ count }))
  },
})
const ChildComposition = ChildDefinition.makeComposition()
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(
      (count: number, label?: string, ...labels: ReadonlyArray<string>) => ({
        model: {
          count,
          labels: label === undefined ? labels : [label, ...labels],
        },
        commands: [Read()],
      }),
    ),
    update: ChildComposition.makeUpdate({
      CompletedRead: model => ({ model }),
    }),
    EffectsLayer: Read.layer,
  })
export const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

export const DefaultChildModel = Schema.Struct({ enabled: Schema.Boolean })
const DefaultChildDefinition = Block.makeDefinition('DefaultSetChild', {
  Model: DefaultChildModel,
  Message: Schema.Never,
})
const DefaultChildComposition = DefaultChildDefinition.makeComposition()
const prepareDefaultChild = () =>
  DefaultChildComposition.prepareBlock({
    init: DefaultChildComposition.makeInit((enabled = true) => ({
      model: { enabled },
    })),
    update: DefaultChildComposition.makeUpdate({}),
  })
export const DefaultChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof DefaultChildModel,
  typeof prepareDefaultChild
> = Block.assemble(prepareDefaultChild)

export const ParentModel = Schema.Struct({
  requiredChild: ChildBlock.Model,
  maybeChild: Schema.Option(ChildBlock.Model),
  projectedChild: ChildBlock.Model,
  defaultChild: DefaultChildBlock.Model,
  label: Schema.String,
})
export const ParentMessage = Message.defineMessageUnion({
  RequestedSet: { count: Schema.Number },
})
export const ParentDefinition = Block.makeDefinition('DeclarationSetParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
export const BaseRequiredBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'required',
  field: 'requiredChild',
  init: { contextToArgs: () => [0] },
})
const foldChildOutMessage = ChildBlock.OutMessage.match<
  Update.Step<typeof ParentModel.Type, typeof ParentMessage.Type>
>({
  ChangedCount: () => ParentDefinition.makeNoopStep(),
})
export const RequiredBinding = BaseRequiredBinding.withOutMessagePolicy({
  fold: foldChildOutMessage,
})
const BaseOptionalBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'optional',
  field: 'maybeChild',
  init: { contextToArgs: () => Option.none() },
})
export const OptionalBinding = BaseOptionalBinding.withOutMessagePolicy({
  fold: foldChildOutMessage,
})
const BaseProjectedBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'projected',
  read: model => Option.some(model.projectedChild),
  write: (model, nextChild) =>
    Struct.modifyFields(model, { projectedChild: () => nextChild }),
  init: {
    contextToArgs: () => [0],
    toParentFields: child => ({ projectedChild: child }),
  },
})
export const ProjectedBinding = BaseProjectedBinding.withOutMessagePolicy({
  fold: foldChildOutMessage,
})
export const DefaultBinding = ParentDefinition.makeBinding(DefaultChildBlock, {
  placement: 'default',
  field: 'defaultChild',
})
export const DisabledStartupBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'disabledStartup',
  field: 'requiredChild',
  init: false,
})
export const ParentOwnedOptionalBinding = ParentDefinition.makeBinding(
  ChildBlock,
  {
    placement: 'parentOwnedOptional',
    field: 'maybeChild',
  },
)
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [
    RequiredBinding,
    OptionalBinding,
    ProjectedBinding,
    DefaultBinding,
  ],
})
export const model = ParentModel.make({
  requiredChild: { count: 0, labels: [] },
  maybeChild: Option.none(),
  projectedChild: { count: 0, labels: [] },
  defaultChild: { enabled: true },
  label: 'current',
})
export const setRequired = (model: typeof ParentModel.Type, count: number) =>
  initAndSet(RequiredBinding, model, { args: [count] })
export const setRequiredWithOptional = (model: typeof ParentModel.Type) =>
  initAndSet(RequiredBinding, model, { args: [1, 'first'] })
export const setRequiredWithRest = (model: typeof ParentModel.Type) =>
  initAndSet(RequiredBinding, model, {
    args: [1, 'first', 'second', 'third'],
  })
export const setGenericCount = <const Count extends number>(
  model: typeof ParentModel.Type,
  count: Count,
) => initAndSet(RequiredBinding, model, { args: [count] })
export const setOptional = (model: typeof ParentModel.Type) =>
  initAndSet(OptionalBinding, model, { args: [2] })
export const setProjected = (model: typeof ParentModel.Type) =>
  initAndSet(ProjectedBinding, model, { args: [3, undefined, 'rest'] })
export const setDefault = (model: typeof ParentModel.Type) =>
  initAndSet(DefaultBinding, model, { args: [] })
export const setExplicitDefault = (model: typeof ParentModel.Type) =>
  initAndSet(DefaultBinding, model, { args: [false] })
export const setDisabledStartup = (model: typeof ParentModel.Type) =>
  initAndSet(DisabledStartupBinding, model, { args: [4] })
export const setParentOwnedOptional = (model: typeof ParentModel.Type) =>
  initAndSet(ParentOwnedOptionalBinding, model, { args: [5] })
export const setStep = ParentDefinition.makeStep(model => setRequired(model, 4))
export const update = ParentComposition.makeUpdate({
  RequestedSet: (model, { count }) => setRequired(model, count),
})
export const init = ParentComposition.makeInit(() => ({
  model: { label: 'current' },
  steps: [setStep],
}))
const prepareParent = () => ParentComposition.prepareBlock({ init, update })
export const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParent
> = Block.assemble(prepareParent)

export const requestedSet = (count: number) =>
  Tuple.make(ParentMessage.RequestedSet({ count }))
