// MODEL

const Post = Schema.Struct({ id: Schema.String, title: Schema.String })

const PostsData = AsyncData.Schema(Schema.Array(Post), Schema.String)

const Model = Schema.Struct({
  posts: PostsData.schema,
})

// MESSAGE

const Message = defineMessageUnion({
  EnteredPostsRoute: {},
  CompletedFetchPosts: {
    result: Schema.Result(Schema.Array(Post), Schema.String),
  },
})

// COMMAND

const FetchPosts = Command.define('FetchPosts', {
  messages: [Message.CompletedFetchPosts],
})

const FetchPostsLayer = FetchPosts.toLayer(
  Effect.succeed(() =>
    pipe(
      fetchPosts,
      Effect.result,
      Effect.map(result => Message.CompletedFetchPosts({ result })),
    ),
  ),
)

// UPDATE

Match.tagsExhaustive({
  EnteredPostsRoute: () =>
    Option.match(AsyncData.revalidateOrLoad(model.posts), {
      onNone: () => ({ model }),
      onSome: nextPosts => ({
        model: modifyFields(model, { posts: () => nextPosts }),
        commands: [FetchPosts()],
      }),
    }),

  CompletedFetchPosts: ({ result }) => ({
    model: modifyFields(model, { posts: AsyncData.settle(result) }),
  }),
})
