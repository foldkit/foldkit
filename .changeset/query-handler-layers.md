---
'foldkit': minor
---

Construct experimental Query and KeyedQuery fetch implementations through `config.handler`, a generator constructor, and expose the attached recipe as `query.layer`. Foldkit applies `Effect.gen` internally. Fetch Commands from these definitions carry a handler requirement through Query loading operations, and `query.run` uses the same handler Layer. Omit `handler` when an external host supplies the fetch implementation; that definition has no `.layer`. `query.toLayer` accepts the host implementation Effect constructor or an alternative to the canonical handler.

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
const postsQuery = Query.define({
  name: 'Posts',
  data: PostList,
  error: Schema.String,
  handler: function* () {
    // Keep the real fetch Effect; execute it on each fetch, not during construction.
    return () => fetchPosts
  },
})

// Provide the fetch handler through the owning feature's effect bundle.
export const EffectsLayer = postsQuery.layer
```

The handler generator produces a function, so return `() => fetchPosts` directly. When construction needs shared services, yield them in the generator and return the fetch function; Foldkit applies `Effect.gen` internally.

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
const postQuery = Query.define({
  name: 'Post',
  args: { postId: Schema.String },
  data: Post,
  error: Schema.String,
  handler: function* () {
    // The returned handler receives the requested key on every fetch.
    return ({ postId }) => fetchPost(postId)
  },
})

export const EffectsLayer = postQuery.layer
```

Include both `.layer` recipes in the owning module's combined `EffectsLayer` when it uses both Queries, and provide that Layer with the application's other handlers. Query loading operations and result Messages use the same API.

Choose Query names so their generated Fetch Command names are distinct from all other Command definitions in the application. For example, `name: 'Posts'` generates `FetchPosts` and must not share that handler name with a separately declared `FetchPosts` Command. TypeScript rejects a same-named provider with an incompatible handler protocol. Definitions with identical names and protocols remain structurally indistinguishable to TypeScript, so Foldkit checks their private identity before the generated Fetch handler runs. Create alternate implementations with the original Query's `toLayer`.
