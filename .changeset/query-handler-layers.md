---
'foldkit': minor
---

Construct experimental Query and KeyedQuery fetch implementations through `config.handler`, a generator constructor, and expose the attached recipe as `query.EffectsLayer`. Foldkit applies `Effect.gen` internally. Fetch Commands from these definitions carry a handler requirement through Query loading operations, and `query.run` uses the same handler Layer. Omit `handler` when an external host supplies the fetch implementation; its Fetch contract remains in `hostHandlers` until `provideHandlers` supplies it. `query.toLayer` accepts the host implementation Effect constructor or an alternative to the canonical handler.

Keep the existing fetch Effect and its data/error Schemas. For example, assume `fetchPosts` requests and decodes an array matching the `PostList` Schema, with failures represented as strings.

**Before**

```ts
import { Schema } from 'effect'
import { Query } from 'foldkit/experimental'

import { fetchPosts } from './api'
import { PostList } from './post'

const postsQuery = Query.define({
  name: 'Posts',
  data: PostList,
  error: Schema.String,
  execute: fetchPosts,
})
```

**After**

```ts
import { Schema } from 'effect'
import { Query } from 'foldkit/experimental'

import { fetchPosts } from './api'
import { PostList } from './post'

const postsQuery = Query.define({
  name: 'Posts',
  data: PostList,
  error: Schema.String,
  handler: function* () {
    // Keep the real fetch Effect; execute it on each fetch, not during construction.
    return () => fetchPosts
  },
})

// The completed Query Block carries this attached handler recipe.
```

The handler generator produces a function, so return `() => fetchPosts` directly. When construction needs shared services, yield them in the generator and return the fetch function; Foldkit applies `Effect.gen` internally.

For a KeyedQuery, preserve the existing args Schema and fetch function. Here `Post` is the data Schema, and `fetchPost(postId)` requests and decodes one post.

**Before**

```ts
import { Schema } from 'effect'
import { Query } from 'foldkit/experimental'

import { fetchPost } from './api'
import { Post } from './post'

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
import { Schema } from 'effect'
import { Query } from 'foldkit/experimental'

import { fetchPost } from './api'
import { Post } from './post'

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

// The completed KeyedQuery Block carries this attached handler recipe.
```

Bind each completed Query through its owning parent Definition. Its attached handler recipe travels with that child Block, so do not merge the Query recipe into the parent’s local `EffectsLayer` a second time. Direct `query.run` and Binding loading operations use the same Fetch implementation and result Messages.

Query's local `Fetch` Command belongs to its named Block. Parent Bindings qualify it by placement, so unrelated Blocks can use the same local Command name. Construct alternatives through the original Query's `toLayer` to preserve its handler identity.

Query and KeyedQuery are completed viewless Blocks. Bind them through the owning parent Definition and list the Binding under `childBindings`:

```ts
import { defineApplication } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { postsQuery } from './query'

const Application = defineApplication({ Model, Message })

const PostsBinding = Application.bindChild(postsQuery, {
  field: 'posts',
  parentMessage: Message.GotPostsMessage,
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [PostsBinding],
})
```

The parent Composition initializes the Query Model and routes its wrapper Message automatically. The Binding exposes Query's `reset`, `revalidate`, `revalidateOrLoad`, and `loadIfMissing` operations with normal Block Command scoping and Message lifting. These connected Steps require the registering Composition's graph on their Model input, so apply them inside `makeUpdate` or startup, or return them from a Definition-owned Step. The Query value itself retains direct `read` and `run` conveniences. Request generations, stale-response protection, cache key typing, handler completeness, host delegation, and constructor error and Service requirements remain precise. A KeyedQuery's cache entries are data inside one Query Model; do not model them as keyed Block instances.

KeyedQuery snapshots decoded args through their declared Codec before retaining them or starting a fetch. Its generated Fetch args and `CompletedFetch` Message now include the canonical `requestKey` alongside `args` and `generation`; completion uses that carried identity instead of recomputing `toKey`. Loading operations and `run` supply the field automatically. Tests or hosts that manually construct a generated Fetch or `CompletedFetch` must pass the same `requestKey` chosen for that request.

For a host-owned Query, omit `handler`, then complete the unresolved Fetch contract with `query.provideHandlers(query.toLayer(constructor))` before binding. Both `provideHandlers` and `replaceEffectsLayer` retain the specialized Query operations on the returned Block.
