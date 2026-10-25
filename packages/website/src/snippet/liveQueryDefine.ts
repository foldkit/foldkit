import { Context, type Option, Schema, type Stream } from 'effect'
import { LiveQuery } from 'foldkit/experimental'

const Order = Schema.Struct({
  id: Schema.String,
  item: Schema.String,
  status: Schema.Literals(['Queued', 'Preparing', 'Ready']),
})

const OrderBoard = Schema.Struct({ orders: Schema.Array(Order) })

const BoardEntryMeta = Schema.Struct({ intentId: Schema.String })

type BoardEntry = Readonly<{
  seq: number
  state: typeof OrderBoard.Type
  meta: typeof BoardEntryMeta.Type
}>

class BoardEvents extends Context.Service<
  BoardEvents,
  Readonly<{
    entries: (
      boardId: string,
      maybeAfter: Option.Option<number>,
    ) => Stream.Stream<BoardEntry, string>
  }>
>()('BoardEvents') {}

const orderBoardQuery = LiveQuery.define({
  name: 'OrderBoard',
  state: OrderBoard,
  error: Schema.String,
  meta: BoardEntryMeta,
  args: { boardId: Schema.String },
  handler: function* () {
    const events = yield* BoardEvents

    return ({ boardId }, maybeAfter) => events.entries(boardId, maybeAfter)
  },
})
