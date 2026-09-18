Subscription.make<Model, Message>()(entry => ({
  watchPost: postChild.watchSubscription(entry, model =>
    Option.match(model.maybeSelectedPostId, {
      onNone: () => [],
      onSome: postId => [{ postId }],
    }),
  ),
}))
