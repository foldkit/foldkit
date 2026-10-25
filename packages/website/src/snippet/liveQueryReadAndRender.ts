const boardArgs = { boardId: 'kitchen' }

const connectionLabel = (connection: LiveQuery.Connection): string =>
  LiveQuery.Connection.match(connection, {
    Connecting: () => 'Connecting',
    Live: () => 'Live',
    Offline: () => 'Offline',
    Failed: () => 'Disconnected',
  })

const boardView = (model: typeof Model.Type, h: HtmlBuilder<Message>): Html => {
  // Read the feed through LiveQuery's public API.
  const boardData = orderBoardQuery.read(model.board, boardArgs)
  const maybeConnection = orderBoardQuery.readConnection(model.board, boardArgs)

  return h.section(
    [],
    [
      h.p(
        [],
        [
          Option.match(maybeConnection, {
            onNone: () => 'Not watching',
            onSome: connectionLabel,
          }),
        ],
      ),
      AsyncData.matchData(boardData, {
        onEmpty: () => h.p([], ['Loading orders…']),
        onFailure: error => h.p([], [error]),
        onData: ({ orders }) =>
          h.ul(
            [],
            Array.map(orders, order =>
              h.keyed('li')(order.id, [], [`${order.item}: ${order.status}`]),
            ),
          ),
      }),
    ],
  )
}
