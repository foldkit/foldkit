const orderBoardQuery = LiveQuery.define({
  name: 'OrderBoard',
  state: OrderBoard,
  error: Schema.String,
  meta: BoardEntryMeta,
  args: { boardId: Schema.String },
})

const OrderBoardBlock = orderBoardQuery.provideHandlers(
  orderBoardQuery.toLayer(
    Effect.map(
      BoardEvents,
      events =>
        ({ boardId }, maybeAfter) =>
          events.entries(boardId, maybeAfter),
    ),
  ),
)
