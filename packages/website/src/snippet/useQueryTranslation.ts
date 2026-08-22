// MODEL

const Post = S.Struct({ id: S.String, title: S.String })

const PostsData = AsyncData.Schema(S.Array(Post), S.String)

const Model = S.Struct({
  posts: PostsData.schema,
})

// MESSAGE

const Message = defineMessageUnion({
  EnteredPostsRoute: {},
  SettledFetchPosts: { result: S.Result(S.Array(Post), S.String) },
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

M.tagsExhaustive({
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
