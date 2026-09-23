const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPostMessage: ({ message }) => postDetails.fold(model, message),
    ClickedPost: ({ postId }) =>
      Update.combine(
        modifyFields(model, {
          maybeSelectedPostId: () => Option.some(postId),
        }),
        [
          postDetails.retainOnly([{ postId }]),
          postDetails.loadIfMissing({ postId }),
        ],
      ),
    ClickedBackToPosts: () =>
      postDetails.reset(
        modifyFields(model, { maybeSelectedPostId: () => Option.none() }),
      ),
  })
