const PostList = Schema.Array(Post)

// The generated FetchPosts Command performs this Effect.
const fetchPosts = Effect.gen(function* () {
  const response = yield* Effect.tryPromise({
    try: () => fetch('/api/posts'),
    catch: () => 'Could not load posts',
  })

  if (!response.ok) {
    return yield* Effect.fail(`Could not load posts (${response.status})`)
  }

  const body = yield* Effect.tryPromise({
    try: () => response.json(),
    catch: () => 'The posts response was invalid',
  })

  return yield* Schema.decodeUnknownEffect(PostList)(body).pipe(
    Effect.mapError(() => 'The posts response was invalid'),
  )
})

const postsQuery = Query.define({
  name: 'Posts',
  data: PostList,
  error: Schema.String,
  execute: fetchPosts,
})
