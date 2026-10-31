---
'foldkit': minor
---

Experimental Query and KeyedQuery are Block classes. `Query.define` returns a class that a parent holds in its Model like any other child Block, and `config.handler` replaces `execute`.

`handler` is a generator that runs once when the Query's Layer is built. Yield any services it needs and return the fetch function, which runs for each Fetch Command. A KeyedQuery fetch receives the declared args. The returned class carries its Layer as `Live`. Omit `handler` when a host supplies the fetch implementation, and build the Layer with the class's `toLayer`, which takes an Effect that constructs the fetch function.

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
  handler: function* () {
    return () => fetchPosts
  },
})
```

Create the instance in the parent's constructor, put it in the parent's Model, and provide `PostsQuery.Live` to the parent's Layer. Pass `{ isLoadingOnStart: true }` to start the first fetch when the instance enters the Model, or `{}` to start Idle. The parent drives loading by sending `Requested*` Messages and reads the retained value with `PostsQuery.read`:

```ts
const posts = yield * new PostsQuery('posts', { isLoadingOnStart: true })

// In an update handler
messages: [model.posts.send(PostsQuery.Message.RequestedRevalidationOrLoad())]

// In the view
const postsAsyncData = PostsQuery.read(model.posts.model)
```

Query accepts `RequestedReset`, `RequestedRevalidation`, `RequestedRevalidationOrLoad`, and `RequestedLoadIfMissing`. KeyedQuery accepts the same Messages with an `args` payload, and `KeyedQuery.read(model, args)` reads one entry. A KeyedQuery's entries are data inside one Query Model, not separate Block instances.

KeyedQuery decodes args through their declared Schema before retaining them or starting a fetch. Its `CompletedFetch` Message carries the `requestKey` chosen when the request started, alongside `args` and `generation`, and completion uses that key instead of recomputing `toKey`. Tests that construct `CompletedFetch` by hand must pass the same `requestKey`.
