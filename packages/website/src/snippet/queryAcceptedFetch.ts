const prefetchFirstPost =
  (postList: ReadonlyArray<Post>): Update.Step<Model, Message> =>
  model =>
    Option.match(Array.head(postList), {
      onNone: () => ({ model }),
      onSome: ({ id }) => postDetails.loadIfMissing(model, { postId: id }),
    })

const posts = postsQuery.lift<Model, Message>({
  parentField: 'posts',
  toParentMessage: message => Message.GotPostsMessage({ message }),
  // Runs for the result Query accepts, never for a late completion.
  foldOutMessage: postsQuery.OutMessage.match<Update.Step<Model, Message>>({
    AcceptedFetch: ({ result }) =>
      Result.match(result, {
        onSuccess: prefetchFirstPost,
        onFailure: () => model => ({ model }),
      }),
  }),
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPostsMessage: ({ message }) => posts.fold(model, message),
    GotPostMessage: ({ message }) => postDetails.fold(model, message),
  })
