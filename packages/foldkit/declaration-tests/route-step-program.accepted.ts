import { Context, Effect, Layer, Schema, Tuple } from 'effect'
import { Block, Command, Message, Program, Update } from 'foldkit'
import { Transition, defineRouteUnion } from 'foldkit/route'

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

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  NoteDetail: { id: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

export const PolicyMessage = Message.defineMessageUnion({
  CompletedLoadDetail: {},
  CompletedPersistDraft: {},
})
export type PolicyMessage = typeof PolicyMessage.Type
export const PolicyOutMessage = Message.defineMessageUnion({
  EnteredDetail: {},
  ExitedDetail: {},
})
export type PolicyOutMessage = typeof PolicyOutMessage.Type
export const PolicyModel = Schema.Struct({ activeId: Schema.String })
export type PolicyModel = typeof PolicyModel.Type

export class DetailService extends Context.Service<
  DetailService,
  Readonly<{ detail: string }>
>()('RouteStepProgram/DetailService') {}
export class DraftService extends Context.Service<
  DraftService,
  Readonly<{ draft: string }>
>()('RouteStepProgram/DraftService') {}

export const LoadDetail: Command.Command<PolicyMessage, never, DetailService> =
  {
    name: 'LoadDetail',
    effect: Effect.as(DetailService, PolicyMessage.CompletedLoadDetail()),
  }
export const PersistDraft: Command.Command<PolicyMessage, never, DraftService> =
  {
    name: 'PersistDraft',
    effect: Effect.as(DraftService, PolicyMessage.CompletedPersistDraft()),
  }
export const loadDetail: Update.Step<
  PolicyModel,
  PolicyMessage,
  DetailService
> = model => ({ model, commands: [LoadDetail] })
export const persistDraft: Update.Step<
  PolicyModel,
  PolicyMessage,
  DraftService
> = model => ({ model, commands: [PersistDraft] })
export const preserveModel: Update.Step<
  PolicyModel,
  PolicyMessage
> = model => ({
  model,
})
export type PolicyStep = Update.Step<
  PolicyModel,
  PolicyMessage,
  DetailService | DraftService
>

export const note = ApplicationRoute.NoteDetail({ id: '1' })
export const nextNote = ApplicationRoute.NoteDetail({ id: '2' })
export const policyTransition = Transition.make<ApplicationRoute>(
  note,
  nextNote,
)
export const policyStep = Transition.match<PolicyStep>()(
  policyTransition,
  'NoteDetail',
  {
    Entered: nextRoute => {
      const exactNextRoute: Expect<
        Equal<typeof nextRoute, typeof ApplicationRoute.NoteDetail.Type>
      > = true
      void exactNextRoute

      return loadDetail
    },
    Exited: previousRoute => {
      const exactPreviousRoute: Expect<
        Equal<typeof previousRoute, typeof ApplicationRoute.NoteDetail.Type>
      > = true
      void exactPreviousRoute

      return persistDraft
    },
    Stayed: ({ previousRoute, nextRoute }) => {
      const exactPreviousRoute: Expect<
        Equal<typeof previousRoute, typeof ApplicationRoute.NoteDetail.Type>
      > = true
      const exactNextRoute: Expect<
        Equal<typeof nextRoute, typeof ApplicationRoute.NoteDetail.Type>
      > = true
      void exactPreviousRoute
      void exactNextRoute

      return loadDetail
    },
    Unrelated: () => preserveModel,
  },
)
export const combinedPolicy = Update.combineSteps([policyStep, preserveModel])

export const loadDetailAndNotify: Update.StepWithOutMessage<
  PolicyModel,
  PolicyMessage,
  PolicyOutMessage,
  DetailService
> = model => ({
  model,
  commands: [LoadDetail],
  outMessage: PolicyOutMessage.EnteredDetail(),
})
export const persistDraftAndNotify: Update.StepWithOutMessage<
  PolicyModel,
  PolicyMessage,
  PolicyOutMessage,
  DraftService
> = model => ({
  model,
  commands: [PersistDraft],
  outMessage: PolicyOutMessage.ExitedDetail(),
})
export const preserveModelAndNotify: Update.StepWithOutMessage<
  PolicyModel,
  PolicyMessage,
  PolicyOutMessage
> = model => ({ model })
export type PolicyOutStep = Update.StepWithOutMessage<
  PolicyModel,
  PolicyMessage,
  PolicyOutMessage,
  DetailService | DraftService
>

export const selectPolicyOutStep = (
  transition: Transition.Transition<ApplicationRoute>,
) =>
  Transition.matchOrElse<PolicyOutStep>()(
    transition,
    'NoteDetail',
    {
      Entered: nextRoute => {
        const exactNextRoute: Expect<
          Equal<typeof nextRoute, typeof ApplicationRoute.NoteDetail.Type>
        > = true
        void exactNextRoute

        return loadDetailAndNotify
      },
      Exited: previousRoute => {
        const exactPreviousRoute: Expect<
          Equal<typeof previousRoute, typeof ApplicationRoute.NoteDetail.Type>
        > = true
        void exactPreviousRoute

        return persistDraftAndNotify
      },
    },
    () => preserveModelAndNotify,
  )
export const enteredOutStep = selectPolicyOutStep(
  Transition.make<ApplicationRoute>(ApplicationRoute.Home(), note),
)
export const exitedOutStep = selectPolicyOutStep(
  Transition.make<ApplicationRoute>(note, ApplicationRoute.Home()),
)

export const ChildModel = Schema.Struct({ value: Schema.String })
export const ChildMessage = Message.defineMessageUnion({
  RequestedReadValue: {},
  CompletedReadValue: { value: Schema.String },
})
export class Store extends Context.Service<
  Store,
  Readonly<{ read: Effect.Effect<string> }>
>()('RouteStepProgram/Store') {}
export const ChildDefinition = Block.makeDefinition('RouteStepProgramChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
export const ReadValue = ChildDefinition.makeCommand('ReadValue', {
  messages: [ChildMessage.CompletedReadValue],
  handler: function* () {
    const store = yield* Store

    return () =>
      store.read.pipe(
        Effect.map(value => ChildMessage.CompletedReadValue({ value })),
      )
  },
})
export const ChildComposition = ChildDefinition.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({ model: { value: '' } })),
    update: ChildComposition.makeUpdate({
      RequestedReadValue: model => ({ model, commands: [ReadValue()] }),
      CompletedReadValue: (_model, { value }) => ({ model: { value } }),
    }),
    operations: {
      refresh: () => Tuple.make(ChildMessage.RequestedReadValue()),
    },
    EffectsLayer: ReadValue.layer,
  })
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

export const ParentModel = Schema.Struct({ child: ChildModel })
export const ParentMessage = Message.defineMessageUnion({
  RequestedApplyRoutePolicy: {},
})
export const ParentDefinition = Block.makeDefinition('RouteStepProgramParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
export const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
  init: false,
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
export const refreshChild = ChildBinding.refresh()
export const preserveParent = ParentDefinition.makeNoopStep()
export type ConnectedPolicyStep = typeof refreshChild | typeof preserveParent
export const selectConnectedStep = (
  transition: Transition.Transition<ApplicationRoute>,
) =>
  Transition.matchOrElse<ConnectedPolicyStep>()(
    transition,
    'NoteDetail',
    { Entered: () => refreshChild },
    () => preserveParent,
  )
export const connectedStep = selectConnectedStep(
  Transition.make<ApplicationRoute>(ApplicationRoute.Home(), note),
)
export const parentUpdate = ParentComposition.makeUpdate({
  RequestedApplyRoutePolicy: model => connectedStep(model),
})
const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    init: ParentComposition.makeInit(() => ({
      model: { child: { value: '' } },
    })),
    update: parentUpdate,
    view: ParentComposition.makeView((_model, h) => h.div([])),
  })
export const ParentBlock: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)
export const connectedProgram = Program.makeElement({
  block: ParentBlock,
  container: document.createElement('div'),
})
export const StoreLayer = Layer.succeed(Store, { read: Effect.succeed('ok') })
export const completedProgram = connectedProgram.provide(StoreLayer)
