// MODEL

const Post = Schema.Struct({ id: Schema.String, title: Schema.String })

const PostsData = AsyncData.Schema(Schema.Array(Post), Schema.String)

const Model = Schema.Struct({
  posts: PostsData.schema,
})

// MESSAGE

const Message = defineMessageUnion({
  EnteredPostsRoute: {},
  SettledFetchPosts: {
    result: Schema.Result(Schema.Array(Post), Schema.String),
  },
})

// COMMAND

const FetchPosts = Command.define('FetchPosts', {
  messages: [Message.SettledFetchPosts],
  execute: pipe(
    fetchPosts,
    Effect.result,
    Effect.map(result => Message.SettledFetchPosts({ result })),
  ),
})

// UPDATE

Match.tagsExhaustive({
  EnteredPostsRoute: () =>
    Option.match(AsyncData.revalidateOrLoad(model.posts), {
      onNone: () => ({ model }),
      onSome: nextPosts => ({
        model: evo(model, { posts: () => nextPosts }),
        commands: [FetchPosts()],
      }),
    }),

  SettledFetchPosts: ({ result }) => ({
    model: evo(model, { posts: AsyncData.settle(result) }),
  }),
})
