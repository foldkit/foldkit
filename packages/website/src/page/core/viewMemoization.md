# View Memoization

## Skipping Stable Subtrees {#overview}

Every Model change calls view again. Foldkit builds the next VNode tree and diffs it against the previous tree. Most views need no extra optimization, but a large subtree that rarely changes can repeat the same construction and diff work on every render.

Foldkit provides two memoization helpers:

- `createLazy` caches a view rendered at one position.
- `createKeyedLazy` gives one view function a separate cache for each list item, entity, or call site.

Each helper caches the VNode returned by a view function. On a later live render, Foldkit reuses it when the function and every argument still have the same references. The DOM differ sees the same VNode object and skips the subtree.

## createLazy {#create-lazy}

`createLazy` creates one memoization slot. Declare it at module scope, then use it to wrap an expensive subtree rendered at one position.

::Snippet{name="createLazy" label="Using createLazy"}

Both the view function and the lazy slot must stay at module scope. Defining either inside view creates a new reference on every render, so the cache always misses.

Arguments are compared by reference, not by value. This works with [modifyFields](/best-practices/immutability#immutable-updates): an unchanged Model branch keeps its reference, so a lazy view receiving that branch can reuse its VNode.

## createKeyedLazy {#create-keyed-lazy}

`createKeyedLazy` stores an independent memoization slot for every key. Use it when one view function renders several positions, such as rows in a list.

::Snippet{name="createKeyedLazy" label="Using createKeyedLazy"}

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

### Good Candidates

Consider a lazy view when:

- A large subtree changes less often than its parent.
- A long list usually changes only a few items.
- Profiling shows that building or diffing a view is expensive.

### Verify with Profiling

Do not add lazy views to every function. Small views and inputs that change on every render receive no useful cache hits. Confirm the repeated work with the [slow warnings](/core/slow-warnings) and a profiler first.

:::Info{label="How it works under the hood"}
Foldkit's differ compares the old and new VNode by reference before diffing. When they are the same object, it skips attribute comparison, child reconciliation, and DOM updates.

The active dispatch is also part of the internal cache key because event handlers close over it. A DevTools replay uses a non-live dispatch, so Foldkit rebuilds the subtree before returning to the live application even when the function and arguments are unchanged.
:::

## Testing Cache Reuse

Use `Lazy.expectAllReused` from `foldkit/test` to check that lazy views reuse their cached results. It renders the view with `model`, then with `nextModel` if supplied, and throws if any lazy call misses its cache on the second render. Without `nextModel`, both renders use `model`.

::Snippet{name="lazyExpectAllReused" label="Checking lazy cache reuse"}

The error identifies each cache miss by slot number, includes the key for keyed calls, and gives a hint for each kind of miss. For `ArgumentsChanged`, it lists the changed argument indices, starting at zero.

Slot numbers follow the order in which lazy instances are first called on the second render. All keys from one `createKeyedLazy` instance share a slot number.

### Testing a Model Transition

Pass `nextModel` to check reuse across a Model change. For example, a view that renders a title directly and memoizes its rows should reuse those rows when only the title changes:

::Snippet{name="lazyExpectAllReusedTransition" label="Checking row reuse after a title change"}

Every lazy call made on the second render must hit its cache. A changed argument causes the assertion to throw even when the view should rebuild that subtree. Test a child view directly when only that child's arguments should stay unchanged. A transition failure names `nextModel` in the error and lists the misses.

### Choosing Models to Test

Test each Model state that renders different memoized content. For example, a view whose Model has an `activeTab` field needs a case for each tab:

::Snippet{name="lazyExpectAllReusedStates" label="Checking cache reuse for each tab"}

The helper throws when the second render makes no lazy calls. Choose Models that render the memoized content you want to test. For keyed lists, include several items so the test exercises separate cache entries. Use the view's other tests for states that make no lazy calls.

An outer lazy cache hit skips its child view. Test that child view directly to check the lazy calls inside it. A passing assertion covers only the lazy calls made during the second render.
