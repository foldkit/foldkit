const Model = Schema.Struct({
  posts: postsQuery.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  GotPostsMessage: { message: postsQuery.Message },
  ClickedRefreshPosts: {},
})
type Message = typeof Message.Type

// Lift the Query's operations into the parent Model and Message types.
const posts = postsQuery.lift<Model, Message>({
  parentField: 'posts',
  toParentMessage: message => Message.GotPostsMessage({ message }),
})

const init = () => {
  const model = Model.make({ posts: postsQuery.init() })

  // Return the Loading Model state and the first FetchPosts Command.
  return posts.loadIfMissing(model)
}

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    // Run Query's update, then write its Model back into the parent.
    GotPostsMessage: ({ message }) => posts.fold(model, message),
    // Return the transition and Command for either missing or retained data.
    ClickedRefreshPosts: () => posts.revalidateOrLoad(model),
  })
