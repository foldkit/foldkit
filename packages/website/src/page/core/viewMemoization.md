# View Memoization

## Overview

In [The Elm Architecture](https://guide.elm-lang.org/architecture/), every model change triggers a full call to `view(model)`. The entire virtual DOM tree is rebuilt from scratch, then diffed against the previous tree to compute minimal DOM updates. For most apps this is fast enough, but when a view contains a large subtree that rarely changes, the cost of rebuilding and diffing that subtree on every render adds up.

Foldkit provides two functions for skipping unnecessary view work: `createLazy` for a view rendered at one position, and `createKeyedLazy` for one view function rendered under many keys, whether those are list rows, entities addressed by id, or separate call sites. Both work by caching the VNode returned by a view function. When the function reference and all arguments are referentially equal (`===`) to the previous call, the cached VNode is returned without re-running the view function. The differ short-circuits when it sees the same VNode reference, so both VNode construction and subtree diffing are skipped.

## createLazy {#create-lazy}

`createLazy` creates a single memoization slot. Call it at module level to create a cache, then use it in your view to wrap an expensive subtree:

::Snippet{name="createLazy" label="createLazy example"}

Both the view function and the lazy slot must be defined at module level. If the view function is defined inside the view, a new function reference is created on every render, which means the `fn === previousFn` check always fails and the cache is never used.

Arguments are compared by reference, not by value. This works naturally with [evo](/best-practices/immutability#immutable-updates): when a Model field isn’t updated, `evo` preserves its reference. Only fields that actually changed get new references, so unchanged arguments automatically pass the `===` check.

## createKeyedLazy {#create-keyed-lazy}

`createKeyedLazy` creates a `Map`-backed cache where each key gets its own independent memoization slot. This is designed for lists where individual items change independently:

::Snippet{name="createKeyedLazy" label="createKeyedLazy example"}

When one item in the list changes, only that item is recomputed. All other items return their cached VNodes instantly. This reduces the expensive item-subtree recomputation to `O(1)` for the common case where only one or two items change, though the parent view still traverses the full list.

:::Warning{label="One slot per position"}
A cached VNode can only be rendered at one position in the tree. The differ records each VNode object's real DOM element on the VNode itself, so rendering the same cached VNode at two positions causes patches to collide and can duplicate or misplace DOM nodes. If the same content needs to appear in multiple positions (for example, the same navigation in a desktop sidebar and a mobile menu), give each position its own key.
:::

## Keying by Entity Identity {#key-by-entity-identity}

A keyed lazy is not only for lists. Any time one view function serves many things, the key is what separates them. A blog post page renders a different post per slug at the same position in the tree, so a single `createLazy` slot would thrash: every navigation overwrites the one cached VNode, and going back to the post you just left rebuilds it from scratch.

The rule is the one that already governs [DOM identity](/best-practices/keying#keying). The stable Model identifier that keys an entity’s DOM is the identifier that memoizes its view. A post the route addresses by `post.slug` memoizes under `post.slug`; a row keyed `todo.id` through `h.keyed` memoizes under `todo.id`. Reusing that single identifier keeps the memo and the DOM invalidating together, so a cached VNode never outlives the entity it was built for.

::Snippet{name="createKeyedLazyEntity" label="Memoizing an entity view by its identifier"}

The same key also separates call sites. When one view function renders in two places, each call site is a key rather than its own `createLazy`. That satisfies the one-slot-per-position rule above without a second memo to keep in sync.

:::Info{label="Keys are never evicted"}
`createKeyedLazy` holds every key it has seen for the lifetime of the page. That is the right trade for a bounded set, such as an entity registry, a route table, or a fixed set of call sites. A key drawn from something unbounded, such as a search query or a paged cursor, grows the map without limit. If an app needs that shape, the fix is a variant that drops keys absent from the latest render pass, not a cap on this one.
:::

## When to Use Lazy Views {#when-to-use-lazy}

Lazy views help most when:

- A large view subtree changes infrequently relative to how often the parent re-renders
- A list has many items but only a few change at a time (table of contents, contact lists, dashboards)
- The view function is expensive to compute (deeply nested trees, many elements)

Lazy views are unnecessary for small views, views that change on every model update, or leaf nodes with minimal children. The memoization check itself has a small cost, so applying it everywhere would add overhead without benefit.

:::Info{label="How it works under the hood"}
Foldkit’s differ (a vendored fork of [Snabbdom](https://github.com/snabbdom/snabbdom)) compares the old and new VNode by reference before diffing. When `oldVnode === newVnode`, it returns immediately. No attribute comparison, no child reconciliation, no DOM touching. `createLazy` and `createKeyedLazy` exploit this by returning the exact same VNode object when inputs are unchanged.
:::
