import { Context, Effect, Layer, Schema } from 'effect'
import { Block, Message as FoldkitMessage, Program } from 'foldkit'
import type * as Command from 'foldkit/command'
import type * as Update from 'foldkit/update'

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

export class BoundaryService extends Context.Service<
  BoundaryService,
  Readonly<{ readonly base: number }>
>()('InterfaceBoundaryService') {}

export const Model = Schema.Struct({ count: Schema.NumberFromString })
export const Message = FoldkitMessage.defineMessageUnion({
  RequestedIncrement: { count: Schema.Number },
  CompletedIncrement: { count: Schema.Number },
})
export const OutMessage = FoldkitMessage.defineMessageUnion({
  ReportedCount: { count: Schema.Number },
})

const PlainDefinition = Block.makeDefinition('InterfaceBoundaryPlain', {
  Model,
  Message,
})
const ReportingDefinition = Block.makeDefinition('InterfaceBoundaryReporting', {
  Model,
  Message,
  OutMessage,
})
const Increment = PlainDefinition.makeCommand('Increment', {
  args: { count: Schema.Number },
  messages: [Message.CompletedIncrement],
  handler: function* () {
    const service = yield* BoundaryService

    return ({ count }) =>
      Effect.succeed(
        Message.CompletedIncrement({ count: count + service.base }),
      )
  },
})
const PlainComposition = PlainDefinition.makeComposition()
const ReportingComposition = ReportingDefinition.makeComposition()
const plainInit = PlainComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const reportingInit = ReportingComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const plainUpdate = PlainComposition.makeUpdate({
  RequestedIncrement: (model, { count }) => ({
    model,
    commands: [Increment({ count })],
  }),
  CompletedIncrement: (model, { count }) => ({
    model: Model.make({ count }),
  }),
})
const reportingUpdate = ReportingComposition.makeUpdate({
  RequestedIncrement: (model, { count }) => ({
    model,
    outMessage: OutMessage.ReportedCount({ count }),
  }),
  CompletedIncrement: (model, { count }) => ({
    model: Model.make({ count }),
    outMessage: OutMessage.ReportedCount({ count }),
  }),
})
const plainView = PlainComposition.makeView((model, h) =>
  h.div([], [globalThis.String(model.count)]),
)
const reportingView = ReportingComposition.makeView((model, h) =>
  h.div([], [globalThis.String(model.count)]),
)
const EffectsLayer = Increment.layer

const prepareViewed = () =>
  PlainComposition.prepareBlock({
    init: plainInit,
    update: plainUpdate,
    view: plainView,
    operations: {
      requestIncrement: Message.RequestedIncrement,
    },
    EffectsLayer,
  })
const prepareReportingViewed = () =>
  ReportingComposition.prepareBlock({
    init: reportingInit,
    update: reportingUpdate,
    view: reportingView,
  })
const prepareReportingHeadless = () =>
  ReportingComposition.prepareBlock({
    init: reportingInit,
    update: reportingUpdate,
  })
const prepareHeadless = () =>
  PlainComposition.prepareBlock({
    init: plainInit,
    update: plainUpdate,
    EffectsLayer,
  })

export interface ViewedBlock extends Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareViewed
> {}
export const ViewedBlock: ViewedBlock = Block.assemble(prepareViewed)

export interface ReportingViewedBlock extends Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepareReportingViewed
> {}
export const ReportingViewedBlock: ReportingViewedBlock = Block.assemble(
  prepareReportingViewed,
)

export interface ReportingHeadlessBlock extends Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareReportingHeadless
> {}
export const ReportingHeadlessBlock: ReportingHeadlessBlock = Block.assemble(
  prepareReportingHeadless,
)

export interface HeadlessBlock extends Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareHeadless
> {}
export const HeadlessBlock: HeadlessBlock = Block.assemble(prepareHeadless)

const ApplicationModel = Schema.Struct({ child: ViewedBlock.Model })
const ApplicationMessage = FoldkitMessage.defineMessageUnion({
  RequestedRefresh: { count: Schema.Number },
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model: ApplicationModel,
  Message: ApplicationMessage,
})
const ChildBinding = ApplicationDefinition.makeBinding(ViewedBlock, {
  field: 'child',
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [ChildBinding],
})
const applicationInit = ApplicationComposition.makeInit(() => ({ model: {} }))
const applicationUpdate = ApplicationComposition.makeUpdate({
  RequestedRefresh: (model, { count }) =>
    ChildBinding.requestIncrement({ count })(model),
})
const applicationView = ApplicationComposition.makeView((model, h) => ({
  title: globalThis.String(model.child.count),
  body: h.block(
    ChildBinding.embedView({ slotId: 'child', model: model.child }),
  ),
}))
const prepareApplication = () =>
  ApplicationComposition.prepareBlock({
    init: applicationInit,
    update: applicationUpdate,
    view: applicationView,
    operations: {
      requestRefresh: ApplicationMessage.RequestedRefresh,
    },
  })
export interface ApplicationBlock extends Block.FromAssemblyWithView<
  typeof ApplicationModel,
  typeof prepareApplication
> {}
export const ApplicationBlock: ApplicationBlock =
  Block.assemble(prepareApplication)
export const makeApplication = () =>
  Program.make({ block: ApplicationBlock, container: document.body })
export const applicationModel = ApplicationBlock.init().model
export const applicationMessage = ApplicationMessage.RequestedRefresh({
  count: 2,
})
const applicationStep = ApplicationBlock.update(applicationMessage)

export type ApplicationBoundaryAssertions = [
  Expect<Equal<typeof ApplicationBlock.Model, typeof ApplicationModel>>,
  Expect<Equal<typeof applicationModel, typeof ApplicationModel.Type>>,
  Expect<
    Equal<
      Parameters<typeof ApplicationBlock.update>,
      [
        model: typeof ApplicationModel.Type,
        message: typeof ApplicationComposition.Message.Type,
      ]
    >
  >,
  Expect<
    Equal<
      Parameters<typeof applicationStep>,
      [model: typeof ApplicationModel.Type]
    >
  >,
  Expect<
    Equal<
      ReturnType<typeof applicationStep>,
      ReturnType<typeof ApplicationBlock.update>
    >
  >,
  Expect<
    Equal<
      Update.RequirementsOf<typeof ApplicationBlock.update>,
      Block.Scoped<'child', Command.HandlerOf<typeof Increment>>
    >
  >,
  Expect<
    Equal<Layer.Services<typeof ApplicationBlock.EffectsLayer>, BoundaryService>
  >,
  Expect<Equal<Layer.Error<typeof ApplicationBlock.EffectsLayer>, never>>,
]

type ViewedAlias = Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareViewed
>
type ReportingViewedAlias = Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepareReportingViewed
>
type ReportingHeadlessAlias = Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareReportingHeadless
>
type HeadlessAlias = Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareHeadless
>

export type ExactBoundaryAssertions = [
  Expect<Equal<ViewedBlock, ViewedAlias>>,
  Expect<Equal<ReportingViewedBlock, ReportingViewedAlias>>,
  Expect<Equal<ReportingHeadlessBlock, ReportingHeadlessAlias>>,
  Expect<Equal<HeadlessBlock, HeadlessAlias>>,
  Expect<Equal<typeof ViewedBlock.Model, typeof Model>>,
  Expect<Equal<typeof ViewedBlock.Model.Type, typeof Model.Type>>,
  Expect<Equal<typeof ViewedBlock.Model.Encoded, typeof Model.Encoded>>,
  Expect<Equal<typeof ViewedBlock.Message, typeof Message>>,
  Expect<Equal<typeof ReportingViewedBlock.OutMessage, typeof OutMessage>>,
  Expect<Equal<typeof ViewedBlock.operations, ViewedAlias['operations']>>,
  Expect<Equal<typeof ViewedBlock.makeView, ViewedAlias['makeView']>>,
  Expect<
    Equal<Layer.Services<typeof ViewedBlock.EffectsLayer>, BoundaryService>
  >,
  Expect<Equal<Layer.Error<typeof ViewedBlock.EffectsLayer>, never>>,
]

export const viewedModel = ViewedBlock.init().model
export const viewedMessage = ViewedBlock.operations.requestIncrement(
  viewedModel,
  { count: 2 },
)
export const reportingOutMessage = OutMessage.ReportedCount({ count: 2 })
