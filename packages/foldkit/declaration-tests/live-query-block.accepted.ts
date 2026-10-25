import { Context, Effect, Layer, Option, Schema, Stream } from 'effect'
import * as Block from 'foldkit/block'
import * as LiveQuery from 'foldkit/experimental/liveQuery'
import * as Message from 'foldkit/message'

const Board = Schema.Struct({ cards: Schema.Array(Schema.String) })
const EntryMeta = Schema.Struct({ intentId: Schema.String })

export class BoardEvents extends Context.Service<
  BoardEvents,
  Readonly<{
    entries: (
      boardId: string,
      maybeAfter: Option.Option<number>,
    ) => Stream.Stream<
      Readonly<{
        seq: number
        state: typeof Board.Type
        meta: typeof EntryMeta.Type
      }>,
      string
    >
  }>
>()('DeclarationBoardEvents') {}

export const BoardFeed = LiveQuery.define({
  name: 'DeclarationBoardFeed',
  state: Board,
  error: Schema.String,
  meta: EntryMeta,
  args: { boardId: Schema.String },
})

export const BoardFeedLayer = BoardFeed.toLayer(
  Effect.succeed(() => Stream.empty),
)

export const ProvidedBoardFeed = BoardFeed.provideHandlers(BoardFeedLayer)

export const CanonicalBoardFeed = LiveQuery.define({
  name: 'DeclarationCanonicalBoardFeed',
  state: Board,
  error: Schema.String,
  meta: EntryMeta,
  args: { boardId: Schema.String },
  handler: function* () {
    const events = yield* BoardEvents

    return ({ boardId }, maybeAfter) => events.entries(boardId, maybeAfter)
  },
})

export const DocumentFeed = LiveQuery.define({
  name: 'DeclarationDocumentFeed',
  state: Schema.String,
  error: Schema.String,
  args: { documentId: Schema.String },
  handler: function* () {
    return () => Stream.make({ seq: 1, state: 'draft' })
  },
})

const ParentModel = Schema.Struct({ board: CanonicalBoardFeed.Model })
export const ParentMessage = Message.defineMessageUnion({ OpenedBoard: {} })
const DeclarationLiveQueryParentDefinition = Block.makeDefinition(
  'DeclarationLiveQueryParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)

export const BoardBinding = DeclarationLiveQueryParentDefinition.makeBinding(
  CanonicalBoardFeed,
  { field: 'board' },
).withOutMessagePolicy({
  fold: DeclarationLiveQueryParentDefinition.makeOutMessageFold(
    CanonicalBoardFeed,
    { AppliedEntry: DeclarationLiveQueryParentDefinition.makeNoopStep },
  ),
})

export const DeclarationLiveQueryParentComposition =
  DeclarationLiveQueryParentDefinition.makeComposition({
    bindings: [BoardBinding],
  })

const prepareApplication = () =>
  DeclarationLiveQueryParentComposition.prepareBlock({
    init: DeclarationLiveQueryParentComposition.makeInit(() => ({
      model: {},
      steps: [
        BoardBinding.requestWatch({
          args: { boardId: 'kitchen' },
          maybeSnapshot: Option.none(),
        }),
      ],
    })),
    update: DeclarationLiveQueryParentComposition.makeUpdate((model, message) =>
      ParentMessage.match(message, {
        OpenedBoard: () => BoardBinding.requestResume()(model),
      }),
    ),
    view: DeclarationLiveQueryParentComposition.makeView(() => null),
    EffectsLayer: Layer.empty,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareApplication
> = Block.assemble(prepareApplication)

export const BoardEventsLayer = Layer.succeed(BoardEvents, {
  entries: () => Stream.empty,
})
