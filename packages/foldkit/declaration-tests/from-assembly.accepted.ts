import { Context, Effect, Layer, Schema } from 'effect'
import { Block, Message as MessageModule, Struct } from 'foldkit'

export type Assembled<Producer extends () => Block.AssemblyDraft<object>> =
  ReturnType<Producer> extends Block.AssemblyDraft<infer Completed>
    ? Completed
    : never

export class Store extends Context.Service<
  Store,
  Readonly<{ saveCount: (count: number) => Effect.Effect<void> }>
>()('FromAssembly/Store') {}

export const Model = Schema.Struct({ count: Schema.Number })
export const ViewInputs = Schema.Struct({ label: Schema.String })
export const Message = MessageModule.defineMessageUnion({
  RequestedSetCount: { count: Schema.Number },
  CompletedSaveCount: {},
  CompletedObservePanel: {},
})
export const OutMessage = MessageModule.defineMessageUnion({
  ChangedCount: { count: Schema.Number },
})

export const CountDefinition = Block.makeDefinition('FromAssemblyCount', {
  Model,
  Message,
})

export const ReportingCountDefinition = Block.makeDefinition(
  'FromAssemblyReportingCount',
  { Model, Message, OutMessage },
)

export const SaveCount = CountDefinition.makeCommand('SaveCount', {
  args: { count: Message.RequestedSetCount.fields.count },
  messages: [Message.CompletedSaveCount],
  handler: function* () {
    const store = yield* Store

    return ({ count }) =>
      Effect.as(store.saveCount(count), Message.CompletedSaveCount())
  },
})

export const ObservePanel = CountDefinition.makeMount('ObservePanel', {
  messages: [Message.CompletedObservePanel],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedObservePanel())
  },
})

export const CountComposition = CountDefinition.makeComposition({
  mounts: [ObservePanel],
})

export const init = CountComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))

export const update = CountComposition.makeUpdate({
  RequestedSetCount: (model, { count }) => ({
    model: Struct.modifyFields(model, { count: () => count }),
    commands: [SaveCount({ count })],
  }),
  CompletedSaveCount: model => ({ model }),
  CompletedObservePanel: model => ({ model }),
})

export const view = CountComposition.makeView.withInputs<
  typeof ViewInputs.Type
>((model, { label }, h) =>
  h.div(
    [h.OnMount(ObservePanel())],
    [`${label}: ${globalThis.String(model.count)}`],
  ),
)

export const EffectsLayer = Layer.merge(SaveCount.layer, ObservePanel.layer)

export const prepareViewed = () =>
  CountComposition.prepareBlock({
    init,
    update,
    view,
    operations: { setCount: Message.RequestedSetCount },
    EffectsLayer,
  })

export const prepareHeadless = () =>
  CountComposition.prepareBlock({
    init,
    update,
    operations: { setCount: Message.RequestedSetCount },
    EffectsLayer,
  })

const ReportingComposition = ReportingCountDefinition.makeComposition()
const reportingInit = ReportingComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const reportingUpdate = ReportingComposition.makeUpdate({
  RequestedSetCount: (model, { count }) => ({
    model: Struct.modifyFields(model, { count: () => count }),
    outMessage: OutMessage.ChangedCount({ count }),
  }),
  CompletedSaveCount: model => ({ model }),
  CompletedObservePanel: model => ({ model }),
})
const reportingView = ReportingComposition.makeView((model, h) =>
  h.div([], [globalThis.String(model.count)]),
)

export const prepareReportingViewed = () =>
  ReportingComposition.prepareBlock({
    init: reportingInit,
    update: reportingUpdate,
    view: reportingView,
    operations: { setCount: Message.RequestedSetCount },
  })

export const prepareReportingHeadless = () =>
  ReportingComposition.prepareBlock({
    init: reportingInit,
    update: reportingUpdate,
    operations: { setCount: Message.RequestedSetCount },
  })

export declare const prepareErased: () => never

export const OriginalViewed: Assembled<typeof prepareViewed> =
  Block.assemble(prepareViewed)
export const Viewed: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareViewed
> = Block.assemble(prepareViewed)

export const replaceOriginalViewed: typeof OriginalViewed.replaceEffectsLayer =
  OriginalViewed.replaceEffectsLayer
export const replaceViewed: typeof Viewed.replaceEffectsLayer =
  Viewed.replaceEffectsLayer

export const OriginalHeadless: Assembled<typeof prepareHeadless> =
  Block.assemble(prepareHeadless)
export const Headless: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareHeadless
> = Block.assemble(prepareHeadless)

export const OriginalReportingViewed: Assembled<typeof prepareReportingViewed> =
  Block.assemble(prepareReportingViewed)
export const ReportingViewed: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepareReportingViewed
> = Block.assemble(prepareReportingViewed)

export const OriginalReportingHeadless: Assembled<
  typeof prepareReportingHeadless
> = Block.assemble(prepareReportingHeadless)
export const ReportingHeadless: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareReportingHeadless
> = Block.assemble(prepareReportingHeadless)

export const RawParentDefinition = Block.makeDefinition(
  'FromAssemblyRawParent',
  {
    Model: Schema.Struct({ child: OriginalViewed.Model }),
    Message: Schema.Never,
  },
)
export const RawParentBinding = RawParentDefinition.makeBinding(
  OriginalViewed,
  {
    field: 'child',
  },
)
export const RawParentComposition = RawParentDefinition.makeComposition({
  bindings: [RawParentBinding],
})

const prepareRawParent = () =>
  RawParentComposition.prepareBlock({
    init: RawParentComposition.makeInit(() => ({ model: {} })),
    update: RawParentComposition.makeUpdate({}),
    view: RawParentComposition.makeView((model, h) =>
      h.block(
        RawParentBinding.embedView({
          slotId: 'child',
          model: model.child,
          viewInputs: { label: 'Count' },
        }),
      ),
    ),
  })

export const RawParent: Assembled<typeof prepareRawParent> =
  Block.assemble(prepareRawParent)

export const ParentDefinition = Block.makeDefinition('FromAssemblyParent', {
  Model: Schema.Struct({ child: Viewed.Model }),
  Message: Schema.Never,
})
export const ParentBinding = ParentDefinition.makeBinding(Viewed, {
  field: 'child',
})
export const HeadlessBinding = ParentDefinition.makeBinding(Headless, {
  field: 'child',
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ParentBinding],
})

const prepareParent = () =>
  ParentComposition.prepareBlock({
    init: ParentComposition.makeInit(() => ({ model: {} })),
    update: ParentComposition.makeUpdate({}),
    view: ParentComposition.makeView((model, h) =>
      h.block(
        ParentBinding.embedView({
          slotId: 'child',
          model: model.child,
          viewInputs: { label: 'Count' },
        }),
      ),
    ),
  })

export const OriginalParent: Assembled<typeof prepareParent> =
  Block.assemble(prepareParent)
export const Parent: Block.FromAssemblyWithView<
  typeof ParentDefinition.Model,
  typeof prepareParent
> = Block.assemble(prepareParent)

export const OriginalErased = prepareErased()
export const ErasedAnnotation: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareErased
> = prepareErased()

declare const bottomProducer: never
export declare const BottomAnnotation: Block.FromAssemblyWithView<
  typeof Model,
  typeof bottomProducer
>
