import { Context, Effect, Schema } from 'effect'
import { Block, Message as MessageModule, Program, Struct } from 'foldkit'
import * as Server from 'foldkit/experimental/server'

export class ConstructorService extends Context.Service<
  ConstructorService,
  Readonly<{
    isAvailable: boolean
    save: (count: number) => Effect.Effect<void>
  }>
>()('MandatoryCompletion/ConstructorService') {}

export class ConstructorFailure {
  readonly _tag = 'ConstructorFailure'
}

export const Model = Schema.Struct({ count: Schema.Number })
export const ViewInputs = Schema.Struct({ label: Schema.String })
export const Message = MessageModule.defineMessageUnion({
  RequestedSetCount: { count: Schema.Number },
  CompletedSaveCount: {},
})
export const OutMessage = MessageModule.defineMessageUnion({
  ChangedCount: { count: Schema.Number },
})

const CountDefinition = Block.makeDefinition('MandatoryCompletionCount', {
  Model,
  Message,
})
const CountComposition = CountDefinition.makeComposition()
export const SaveCount = CountDefinition.makeCommand('SaveCount', {
  args: { count: Schema.Number },
  messages: [Message.CompletedSaveCount],
  handler: function* () {
    const constructorService = yield* ConstructorService

    if (!constructorService.isAvailable) {
      return yield* Effect.fail(new ConstructorFailure())
    }

    return ({ count }) =>
      Effect.as(constructorService.save(count), Message.CompletedSaveCount())
  },
})
const init = CountComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const update = CountComposition.makeUpdate({
  RequestedSetCount: (model, { count }) => ({
    model: Struct.modifyFields(model, { count: () => count }),
    commands: [SaveCount({ count })],
  }),
  CompletedSaveCount: model => ({ model }),
})
const view = CountComposition.makeView.withInputs<typeof ViewInputs.Type>(
  (model, { label }, h) =>
    h.div([], [`${label}: ${globalThis.String(model.count)}`]),
)

export const prepareViewed = () =>
  CountComposition.prepareBlock({
    init,
    update,
    view,
    operations: { setCount: Message.RequestedSetCount },
    EffectsLayer: SaveCount.layer,
  })
export const Viewed: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareViewed
> = Block.assemble(prepareViewed)
export const ViewedDraft = prepareViewed()

const prepareHeadless = () =>
  CountComposition.prepareBlock({
    init,
    update,
    operations: { setCount: Message.RequestedSetCount },
    EffectsLayer: SaveCount.layer,
  })
export const Headless: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareHeadless
> = Block.assemble(prepareHeadless)

const ReportingDefinition = Block.makeDefinition(
  'MandatoryCompletionReportingCount',
  { Model, Message, OutMessage },
)
const ReportingComposition = ReportingDefinition.makeComposition()
const reportingInit = ReportingComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const reportingUpdate = ReportingComposition.makeUpdate({
  RequestedSetCount: (model, { count }) => ({
    model: Struct.modifyFields(model, { count: () => count }),
    outMessage: OutMessage.ChangedCount({ count }),
  }),
  CompletedSaveCount: model => ({ model }),
})
const reportingView = ReportingComposition.makeView((model, h) =>
  h.div([], [globalThis.String(model.count)]),
)

const prepareReportingViewed = () =>
  ReportingComposition.prepareBlock({
    init: reportingInit,
    update: reportingUpdate,
    view: reportingView,
  })
export const ReportingViewed: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepareReportingViewed
> = Block.assemble(prepareReportingViewed)

const prepareReportingHeadless = () =>
  ReportingComposition.prepareBlock({
    init: reportingInit,
    update: reportingUpdate,
  })
export const ReportingHeadless: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareReportingHeadless
> = Block.assemble(prepareReportingHeadless)

export const ParentModel = Schema.Struct({
  child: Viewed.Model,
  maybeChild: Schema.Option(Viewed.Model),
  children: Schema.Array(Viewed.Model),
})
const ParentDefinition = Block.makeDefinition('MandatoryCompletionParent', {
  Model: ParentModel,
  Message: Schema.Never,
})
export const ViewedBinding = ParentDefinition.makeBinding(Viewed, {
  field: 'child',
})
export const EmbeddedViewed = ViewedBinding.embedView({
  slotId: 'viewed',
  model: Model.make({ count: 0 }),
  viewInputs: { label: 'Count' },
})

const HostMessage = MessageModule.defineMessageUnion({
  CompletedHostSave: {},
})
const HostDefinition = Block.makeDefinition('MandatoryCompletionHost', {
  Model,
  Message: HostMessage,
})
export const HostSave = HostDefinition.makeCommand('HostSave', {
  messages: [HostMessage.CompletedHostSave],
})
const HostComposition = HostDefinition.makeComposition()
const prepareHostBlock = () =>
  HostComposition.prepareBlock({
    init: HostComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
      commands: [HostSave()],
    })),
    update: HostComposition.makeUpdate({
      CompletedHostSave: model => ({ model }),
    }),
    view: HostComposition.makeView((model, h) =>
      h.div([], [globalThis.String(model.count)]),
    ),
    hostHandlers: [HostSave],
  })
export const HostBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareHostBlock
> = Block.assemble(prepareHostBlock)
export const HostSaveLayer = HostSave.toLayer(
  Effect.succeed(() => Effect.succeed(HostMessage.CompletedHostSave())),
)
export const ProvidedHostBlock = HostBlock.provideHandlers(HostSaveLayer)
export const ElementProgram = Program.makeElement({
  block: ProvidedHostBlock,
  container: null,
})

const PageDefinition = Block.makeDefinition('MandatoryCompletionPage', {
  Model,
  Message: Schema.Never,
})
const PageComposition = PageDefinition.makeComposition()
export const preparePageBlock = () =>
  PageComposition.prepareBlock({
    init: PageComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update: PageComposition.makeUpdate({}),
    view: PageComposition.makeView((model, h) => ({
      title: `Count ${globalThis.String(model.count)}`,
      body: h.main([], [globalThis.String(model.count)]),
    })),
  })
export const PageBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof preparePageBlock
> = Block.assemble(preparePageBlock)
export const PageDraft = preparePageBlock()
export const PageProgram = Program.make({ block: PageBlock, container: null })
export const renderPage = () =>
  Server.renderToString(PageBlock, {}, { isHydratable: false })

export type ItemSchema<Item, Encoded> = Schema.Codec<
  Item,
  Encoded,
  never,
  never
> &
  Readonly<{ '~type.make': Item }>

export const makeChoice = <Item, Encoded>(Item: ItemSchema<Item, Encoded>) => {
  const ChoiceModel = Schema.Struct({ selected: Item })
  const ChoiceMessage = MessageModule.defineMessageUnion({
    RequestedSelect: { selected: Item },
  })
  const ChoiceDefinition = Block.makeDefinition('MandatoryCompletionChoice', {
    Model: ChoiceModel,
    Message: ChoiceMessage,
  })
  const ChoiceComposition = ChoiceDefinition.makeComposition()
  const prepareChoice = () =>
    ChoiceComposition.prepareBlock({
      init: ChoiceComposition.makeInit((selected: Item) => ({
        model: ChoiceModel.make({ selected }),
      })),
      update: ChoiceComposition.makeUpdate({
        RequestedSelect: (model, { selected }) => ({
          model: Struct.modifyFields(model, { selected: () => selected }),
        }),
      }),
      view: ChoiceComposition.makeView.withInputs<
        Readonly<{ format: (item: Item) => string }>
      >((model, { format }, h) => h.div([], [format(model.selected)])),
      operations: { select: ChoiceMessage.RequestedSelect },
    })
  const block: Block.FromAssemblyWithView<
    typeof ChoiceModel,
    typeof prepareChoice
  > = Block.assemble(prepareChoice)

  return block
}

export const NumericChoice = makeChoice(Schema.NumberFromString)
