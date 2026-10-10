---
'foldkit': minor
---

Construct experimental Query and KeyedQuery fetch implementations through the final `Query.define` Effect argument and expose the attached recipe as `query.layer`. Fetch Commands from these definitions carry a handler requirement through Query loading operations, and `query.run` uses the same handler Layer. Omit the final argument when an external host supplies the fetch implementation; that definition has no `.layer`. `query.toLayer` constructs a host implementation or an alternative to the canonical handler.

Keep the existing fetch Effect and its data/error Schemas. For example, assume `fetchPosts` requests and decodes an array matching the `PostList` Schema, with failures represented as strings.

**Before**

```ts
const postsQuery = Query.define({
  name: 'Posts',
  data: PostList,
  error: Schema.String,
  execute: fetchPosts,
})
```

**After**

```ts
const postsQuery = Query.define(
  {
    name: 'Posts',
    data: PostList,
    error: Schema.String,
  },
  Effect.succeed(() => fetchPosts),
)

export const EffectsLayer = postsQuery.layer
```

The constructor produces a function, so use `Effect.succeed(() => fetchPosts)`, rather than passing the fetch Effect itself to `Effect.succeed`. When construction needs shared services, obtain them with `Effect.gen` and return the fetch function.

For a KeyedQuery, preserve the existing args Schema and fetch function. Here `Post` is the data Schema, and `fetchPost(postId)` requests and decodes one post.

**Before**

```ts
const postQuery = Query.define({
  name: 'Post',
  args: { postId: Schema.String },
  data: Post,
  error: Schema.String,
  execute: ({ postId }) => fetchPost(postId),
})
```

**After**

```ts
const postQuery = Query.define(
  {
    name: 'Post',
    args: { postId: Schema.String },
    data: Post,
    error: Schema.String,
  },
  Effect.succeed(({ postId }) => fetchPost(postId)),
)

export const EffectsLayer = postQuery.layer
```

Include both `.layer` recipes in the feature's combined `EffectsLayer` when it uses both Queries, and provide that Layer with the application's other handlers. Query loading operations and result Messages use the same API.
