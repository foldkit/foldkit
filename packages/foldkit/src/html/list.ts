import { Predicate } from 'effect'

import type { VNode } from '../vdom.js'
import { type DispatchSync, requireDispatch } from './runtimeSingleton.js'

const argsEqual = (
  previous: ReadonlyArray<unknown>,
  current: ReadonlyArray<unknown>,
): boolean =>
  previous.length === current.length &&
  previous.every((value, index) => value === current[index])

type CacheEntry = Readonly<{
  args: ReadonlyArray<unknown>
  dispatch: DispatchSync
  vnode: VNode | null
}>

type ListCache = {
  entries: Map<string, CacheEntry>
}

// NOTE: WeakMap keyed by the user's view function. As long as `view` is a
// referentially stable function (typically declared at module scope), the
// per-key memo cache persists across renders. If the user inlines the view
// function inside the parent view, a fresh function reference appears every
// render and the cache misses every time, falling back to "naive" cost. That
// matches `createLazy` semantics: stable function identity is the carrier of
// memoization.
const listCaches = new WeakMap<Function, ListCache>()
const EMPTY_EXTRAS: ReadonlyArray<unknown> = []

const getOrCreateListCache = (view: Function): ListCache => {
  const existing = listCaches.get(view)
  if (Predicate.isNotUndefined(existing)) {
    return existing
  }
  const fresh: ListCache = { entries: new Map() }
  listCaches.set(view, fresh)
  return fresh
}

/**
 * Renders a list of items with keyed lazy memoization built in. Equivalent to
 * `Array.map` over a keyed list, plus the work that `createKeyedLazy` does to
 * cache per-item VNodes by reference-equal deps.
 *
 * Two things matter for memoization to kick in:
 *
 * 1. `view` must be a referentially stable function. Declare it at module
 *    scope (or memoize the reference elsewhere). If the user inlines a fresh
 *    arrow on every parent render, the cache misses every time and `list`
 *    degrades to plain `Array.map` cost.
 * 2. Args must be `===` to the previous render's args. The default is
 *    `[item]`, so memoization works if `item` is referentially stable across
 *    renders (the usual case when the parent rebuilds the array via
 *    `Array.filter`/`Array.map` over a stable underlying todos array).
 *
 * For outer-state-dependent views, pass `extras` to declare additional
 * dependencies. `view` then receives `(item, ...extras)`:
 *
 * @example
 * ```ts
 * const todoItemView = (todo: Todo, editingText: Option<string>) => ...
 *
 * h.list(
 *   filteredTodos,
 *   todo => todo.id,
 *   todoItemView,
 *   todo => [maybeEditingTextFor(model.editing, todo.id)],
 * )
 * ```
 *
 * The returned VNode array carries a `key` on each element (set from
 * `getKey(item)`), so the parent does not need `h.keyed`. Snabbdom uses the
 * key for O(n) child diffing.
 *
 * Stale per-key entries are pruned after each call so the cache does not
 * grow unbounded for views with churning item identities.
 */
export function list<Item>(
  items: ReadonlyArray<Item>,
  getKey: (item: Item) => string,
  view: (item: Item) => VNode | null,
): Array<VNode | null>
export function list<Item, Extras extends ReadonlyArray<unknown>>(
  items: ReadonlyArray<Item>,
  getKey: (item: Item) => string,
  view: (item: Item, ...extras: Extras) => VNode | null,
  getExtras: (item: Item) => readonly [...Extras],
): Array<VNode | null>
export function list<Item>(
  items: ReadonlyArray<Item>,
  getKey: (item: Item) => string,
  view: (item: Item, ...extras: ReadonlyArray<unknown>) => VNode | null,
  getExtras?: (item: Item) => ReadonlyArray<unknown>,
): Array<VNode | null> {
  const cache = getOrCreateListCache(view)
  const dispatch = requireDispatch()
  const liveKeys = new Set<string>()
  const rendered: Array<VNode | null> = []

  for (const item of items) {
    const key = getKey(item)
    liveKeys.add(key)

    const extras = getExtras ? getExtras(item) : EMPTY_EXTRAS
    const args: ReadonlyArray<unknown> = [item, ...extras]

    const previous = cache.entries.get(key)
    let vnode: VNode | null
    if (
      Predicate.isNotUndefined(previous) &&
      previous.dispatch === dispatch &&
      argsEqual(previous.args, args)
    ) {
      vnode = previous.vnode
    } else {
      vnode = view(item, ...extras)
      cache.entries.set(key, { args, dispatch, vnode })
    }

    if (vnode !== null && vnode.key !== key) {
      vnode.key = key
    }

    rendered.push(vnode)
  }

  // Prune entries whose keys did not appear this render. Without this, the
  // cache grows unbounded for views with churning item identities.
  if (cache.entries.size !== liveKeys.size) {
    for (const cachedKey of cache.entries.keys()) {
      if (!liveKeys.has(cachedKey)) {
        cache.entries.delete(cachedKey)
      }
    }
  }

  return rendered
}
