const RECENT_POST_LIMIT = 2

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPostMessage: ({ message }) => postDetails.fold(model, message),
    ClickedPost: ({ postId }) => {
      const nextRecentPostIds = pipe(
        model.recentPostIds,
        Array.filter(recentPostId => recentPostId !== postId),
        Array.prepend(postId),
        Array.take(RECENT_POST_LIMIT),
      )

      return Update.combine(
        modifyFields(model, {
          maybeSelectedPostId: () => Option.some(postId),
          recentPostIds: () => nextRecentPostIds,
        }),
        [
          postDetails.retainOnly(
            Array.map(nextRecentPostIds, recentPostId => ({
              postId: recentPostId,
            })),
          ),
          postDetails.loadIfMissing({ postId }),
        ],
      )
    },
    ClickedBackToPosts: () => ({
      model: modifyFields(model, { maybeSelectedPostId: () => Option.none() }),
    }),
  })
