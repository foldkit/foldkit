const Model = Schema.Struct({
  isBoardVisible: Schema.Boolean,
  maybeOnlineCount: Schema.Option(Schema.Number),
})

const Message = defineMessageUnion({
  ReceivedOnlineCount: { count: Schema.Number },
})

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

// A presence count has no cursor: the latest value replaces the last one,
// and a restart needs no resume position.
const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  onlineCount: entry(
    'OnlineCount',
    { isBoardVisible: Schema.Boolean },
    {
      messages: [Message.ReceivedOnlineCount],
      modelToDependencies: model => ({ isBoardVisible: model.isBoardVisible }),
      handler: function* () {
        const presence = yield* Presence

        return ({ isBoardVisible }) =>
          isBoardVisible
            ? Stream.map(presence.onlineCount, count =>
                Message.ReceivedOnlineCount({ count }),
              )
            : Stream.empty
      },
    },
  ),
}))
