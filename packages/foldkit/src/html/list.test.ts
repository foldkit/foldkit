import { describe, it } from '@effect/vitest'
import { Context } from 'effect'
import { h } from 'snabbdom'
import { afterEach, beforeEach, expect } from 'vitest'

import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import { list } from './list.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from './runtimeSingleton.js'

const noOpDispatchSync: DispatchSync = () => {}

const noOpDispatchService = Dispatch.of({
  dispatchAsync: () =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    Promise.resolve() as unknown as ReturnType<
      typeof Dispatch.Service.dispatchAsync
    >,
  dispatchSync: noOpDispatchSync,
})

const noOpContext = Context.make(Dispatch, noOpDispatchService).pipe(
  Context.add(MountTracker, {
    started: () => {},
    ended: () => {},
  }),
)

const pushNoOpRuntime = (): void => {
  setRuntime(noOpDispatchSync, noOpContext)
}

type Item = Readonly<{ id: string; label: string }>

describe('list', () => {
  beforeEach(() => {
    pushNoOpRuntime()
  })
  afterEach(() => {
    clearRuntime()
  })

  it('renders one VNode per item with the key set from getKey', () => {
    const view = (item: Item) => h('li', {}, [item.label])
    const items: ReadonlyArray<Item> = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]

    const rendered = list(items, item => item.id, view)

    expect(rendered).toHaveLength(2)
    expect(rendered[0]?.key).toBe('a')
    expect(rendered[1]?.key).toBe('b')
  })

  it('reuses cached VNodes when items are referentially equal across calls', () => {
    let callCount = 0
    const view = (item: Item) => {
      callCount += 1
      return h('li', {}, [item.label])
    }
    const items: ReadonlyArray<Item> = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]

    const first = list(items, item => item.id, view)
    const second = list(items, item => item.id, view)

    expect(callCount).toBe(2)
    expect(second[0]).toBe(first[0])
    expect(second[1]).toBe(first[1])
  })

  it('recomputes a single entry when its item changes by reference', () => {
    let callCount = 0
    const view = (item: Item) => {
      callCount += 1
      return h('li', {}, [item.label])
    }
    const stable: Item = { id: 'a', label: 'A' }
    const initial: ReadonlyArray<Item> = [stable, { id: 'b', label: 'B' }]

    list(initial, item => item.id, view)
    expect(callCount).toBe(2)

    const updated: ReadonlyArray<Item> = [
      stable,
      { id: 'b', label: 'B updated' },
    ]
    list(updated, item => item.id, view)
    expect(callCount).toBe(3)
  })

  it('memoizes on item + extras together', () => {
    let callCount = 0
    const view = (item: Item, isActive: boolean) => {
      callCount += 1
      return h('li', { class: { active: isActive } }, [item.label])
    }
    const items: ReadonlyArray<Item> = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]
    const activeIds: Set<string> = new Set(['a'])

    list(
      items,
      item => item.id,
      view,
      item => [activeIds.has(item.id)],
    )
    expect(callCount).toBe(2)

    // Same items, same active set — no recompute.
    list(
      items,
      item => item.id,
      view,
      item => [activeIds.has(item.id)],
    )
    expect(callCount).toBe(2)

    // Flip activeness — only changed items recompute.
    activeIds.delete('a')
    activeIds.add('b')
    list(
      items,
      item => item.id,
      view,
      item => [activeIds.has(item.id)],
    )
    expect(callCount).toBe(4)
  })

  it('drops cache entries whose keys did not appear this render', () => {
    let callCount = 0
    const view = (item: Item) => {
      callCount += 1
      return h('li', {}, [item.label])
    }
    const a: Item = { id: 'a', label: 'A' }
    const b: Item = { id: 'b', label: 'B' }

    list([a, b], item => item.id, view)
    expect(callCount).toBe(2)

    list([a], item => item.id, view)
    expect(callCount).toBe(2)

    // b was evicted; rendering it again should recompute.
    list([a, b], item => item.id, view)
    expect(callCount).toBe(3)
  })

  it('handles empty item lists', () => {
    const view = (item: Item) => h('li', {}, [item.label])
    expect(list<Item>([], item => item.id, view)).toEqual([])
  })

  it('forces a recompute when dispatch identity changes', () => {
    let callCount = 0
    const view = (item: Item) => {
      callCount += 1
      return h('li', {}, [item.label])
    }
    const items: ReadonlyArray<Item> = [{ id: 'a', label: 'A' }]

    list(items, item => item.id, view)
    expect(callCount).toBe(1)

    clearRuntime()
    const otherDispatch: DispatchSync = () => {}
    setRuntime(
      otherDispatch,
      Context.make(
        Dispatch,
        Dispatch.of({
          dispatchAsync: () =>
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            Promise.resolve() as unknown as ReturnType<
              typeof Dispatch.Service.dispatchAsync
            >,
          dispatchSync: otherDispatch,
        }),
      ).pipe(
        Context.add(MountTracker, {
          started: () => {},
          ended: () => {},
        }),
      ),
    )

    list(items, item => item.id, view)
    expect(callCount).toBe(2)
  })
})
