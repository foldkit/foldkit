# View Memoization

## Skipping Stable Subtrees {#overview}

Every Model change calls view again. Foldkit builds the next VNode tree and diffs it against the previous tree. Most views need no extra optimization, but a large subtree that rarely changes can repeat the same construction and diff work on every render.

Foldkit provides two memoization helpers:

- `createLazy` caches a view rendered at one position.
- `createKeyedLazy` gives one view function a separate cache for each list item, entity, or call site.

Each helper caches the VNode returned by a view function. On a later live render, Foldkit reuses it when the function and every argument still have the same references. The DOM differ sees the same VNode object and skips the subtree.

## createLazy {#create-lazy}

`createLazy` creates one memoization slot. Declare it at module scope, then use it to wrap an expensive subtree rendered at one position.

::Snippet{name="createLazy" label="createLazy example"}

Both the view function and the lazy slot must stay at module scope. Defining either inside view creates a new reference on every render, so the cache always misses.

Arguments are compared by reference, not by value. This works with [evo](/best-practices/immutability#immutable-updates): an unchanged Model branch keeps its reference, so a lazy view receiving that branch can reuse its VNode.

## createKeyedLazy {#create-keyed-lazy}

`createKeyedLazy` stores an independent memoization slot for every key. Use it when one view function renders several positions, such as rows in a list.

::Snippet{name="createKeyedLazy" label="createKeyedLazy example"}

When one item changes, its slot misses while unchanged items return their cached VNodes. The parent view still traverses the list, but it does not rebuild or diff each unchanged item subtree.

:::Warning{label="One slot per position"}
A cached VNode can appear at only one position in the tree. Foldkit records its DOM element on the VNode object. Reusing that object at two positions can duplicate or move the wrong DOM node. Give each position its own key. For example: use separate keys for desktop and mobile instances of the same navigation view.
:::

## Keying by Entity Identity {#key-by-entity-identity}

A keyed lazy also separates entities rendered at the same position. A blog page can cache each post by slug, so returning to a previous post can reuse its VNode instead of rebuilding it.

Use the same stable Model identifier for memoization and [DOM identity](/best-practices/keying#keys-and-view-identity). A post addressed by `post.slug` uses `post.slug`. A row keyed with `todo.id` uses `todo.id`. One identifier then names the entity in both systems.

::Snippet{name="createKeyedLazyEntity" label="Memoizing an entity view by its identifier"}

Keys can also identify fixed call sites. If one view function renders in two places, give those positions distinct keys instead of maintaining two `createLazy` slots.

:::Info{label="Keys are never evicted"}
`createKeyedLazy` keeps every key it has seen for the lifetime of the page. Use it with a bounded set, such as an entity registry, route table, or fixed set of call sites. A search query or paged cursor can produce unbounded keys and grow the cache without limit.
:::

## When to Use Lazy Views {#when-to-use-lazy}

Consider a lazy view when:

- A large subtree changes less often than its parent.
- A long list usually changes only a few items.
- Profiling shows that building or diffing a view is expensive.

Do not add lazy views to every function. Small views and inputs that change on every render receive no useful cache hits. Confirm the repeated work with the [slow warnings](/core/slow-warnings) and a profiler first. Use [Re-render Outlines](/devtools/re-render-outlines) to spot over-rendering before adding memoization.

:::Info{label="How it works under the hood"}
Foldkit's differ compares the old and new VNode by reference before diffing. When they are the same object, it skips attribute comparison, child reconciliation, and DOM updates.

The active dispatch is also part of the internal cache key because event handlers close over it. A DevTools replay uses a non-live dispatch, so Foldkit rebuilds the subtree before returning to the live application even when the function and arguments are unchanged.
:::
