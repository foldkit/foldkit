Story.Subscription.emit(
  Story.Subscription.at(
    [RoomsBinding, { binding: FeedsBinding, key: 'orders' }],
    feedSubscriptions.entries,
  ),
  FeedMessage.ReceivedEntry({ sequence: 13, order }),
)
