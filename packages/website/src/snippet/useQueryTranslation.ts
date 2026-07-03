// MODEL

const Post = S.Struct({ id: S.String, title: S.String })

const PostsData = AsyncData.Schema(S.Array(Post), S.String)

const Model = S.Struct({
  posts: PostsData.schema,
})

// MESSAGE

const EnteredPostsRoute = m('EnteredPostsRoute')
const SettledFetchPosts = m('SettledFetchPosts', {
  result: S.Result(S.Array(Post), S.String),
})

// COMMAND

const FetchPosts = Command.define(
  'FetchPosts',
  SettledFetchPosts,
)(
  pipe(
    fetchPosts,
    Effect.result,
    Effect.map(result => SettledFetchPosts({ result })),
  ),
)

// UPDATE

M.tagsExhaustive({
  EnteredPostsRoute: () =>
    Option.match(AsyncData.revalidateOrLoad(model.posts), {
      onNone: () => [model, []],
      onSome: nextPosts => [
        evo(model, { posts: () => nextPosts }),
        [FetchPosts()],
      ],
    }),

  SettledFetchPosts: ({ result }) => [
    evo(model, { posts: AsyncData.settle(result) }),
    [],
  ],
})
