---
'foldkit': minor
---

Experimental Query and KeyedQuery are Block classes. `Query.define` declares a class that a parent holds in its Model like any other child Block, and the class's `layer` replaces `execute`.

`PostsQuery.toLayer` takes an Effect that runs once when the Layer is built. Yield any services it needs and return the fetch function, which runs for each Fetch Command. A KeyedQuery fetch receives the declared args. The returned Layer provides the Query Block and its fetch function, and requires only what the Effect requires.

```ts
// Before
const postsQuery = Query.define({
  name: 'Posts',
  data: PostList,
  error: Schema.String,
  execute: fetchPosts,
})

// After
export const PostsQuery = Query.define({
  name: 'Posts',
  data: PostList,
  error: Schema.String,
})

export const PostsQueryLive = PostsQuery.toLayer(
  Effect.gen(function* () {
    const api = yield* PostsApi
    return () => api.list
  }),
)
```

Create the instance with `new` in the parent's `init`, put it in the parent's Model, and provide `PostsQueryLive` to the parent's Layer. Pass `{ isLoadingOnStart: true }` to start the first fetch when the instance enters the Model, or `{}` to start Idle. The parent drives loading by sending `Requested*` Messages and reads the retained value with `PostsQuery.read`:

```ts
// In the parent's init
init: () => ({
  posts: new PostsQuery('posts', { isLoadingOnStart: true }),
}),

// In an update handler
messages: [model.posts.send(PostsQuery.Message.RequestedRevalidationOrLoad())]

// In the view
const postsAsyncData = PostsQuery.read(model.posts.model)
```

Query accepts `RequestedReset`, `RequestedRevalidation`, `RequestedRevalidationOrLoad`, and `RequestedLoadIfMissing`. KeyedQuery accepts the same Messages with an `args` payload, and `KeyedQuery.read(model, args)` reads one entry. A KeyedQuery's entries are data inside one Query Model, not separate Block instances.

KeyedQuery decodes args through their declared Schema before retaining them or starting a fetch. Its `CompletedFetch` Message carries the `requestKey` chosen when the request started, alongside `args` and `generation`, and completion uses that key instead of recomputing `toKey`. Tests that construct `CompletedFetch` by hand must pass the same `requestKey`.
