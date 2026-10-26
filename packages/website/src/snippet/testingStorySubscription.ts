import { Subscription, given, model, story } from 'foldkit/story'

const feed = Subscription.from(OrderFeedBlock.subscriptions)

story(
  OrderFeedBlock.update,
  given(OrderFeedBlock.init().model),
  feed.emit(
    OrderFeedBlock.subscriptions.entries,
    OrderFeedBlock.Message.ReceivedEntry({ sequence: 13, order }),
  ),
  model(model => {
    expect(model.latestSequence).toBe(13)
  }),
)
