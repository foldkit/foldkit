import { Array, Context, Option, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import { h } from '../snabbdom/index.js'
import { type VNode, __patchVNode } from '../vdom.js'
import {
  type BoundaryRegistry,
  abandonRender,
  beginRenderTransaction,
  clearKeyedLazyCaches,
  createBoundaryRegistry,
  endRender,
} from './boundary.js'
import { __htmlBuilder, defineView } from './index.js'
import { createKeyedLazy, createLazy } from './lazy.js'
import { clearRuntime, setRuntime } from './runtimeSingleton.js'

const dispatch = () => {}
const html = __htmlBuilder<never>()

const render = <A>(registry: BoundaryRegistry, view: () => A): A => {
  beginRenderTransaction(registry)
  setRuntime(dispatch, Context.empty(), registry)

  try {
    const result = view()
    endRender(registry)
    return result
  } catch (error) {
    abandonRender(registry)
    throw error
  } finally {
    clearRuntime()
  }
}

const requiredVNode = (vnode: VNode | null): VNode => {
  if (vnode === null) {
    throw new Error('Expected a rendered node')
  }

  return vnode
}

const rowView = (label: string) => h('li', {}, [label])

describe('render-scoped keyed lazy caches', () => {
  it('evicts omitted keys and preserves the identity of surviving rows', () => {
    const registry = createBoundaryRegistry()
    const lazy = createKeyedLazy({ evict: 'AbsentFromRender' })
    const view = vi.fn(rowView)
    const first = render(registry, () => {
      lazy('removed', view, ['removed'])
      return lazy('kept', view, ['kept'])
    })

    expect(render(registry, () => lazy('kept', view, ['kept']))).toBe(first)
    render(registry, () => {
      lazy('removed', view, ['removed'])
      lazy('kept', view, ['kept'])
    })

    expect(view).toHaveBeenCalledTimes(3)
  })

  it('releases every cache state when the next view renders an empty list', () => {
    const registry = createBoundaryRegistry()
    const lazy = createKeyedLazy({ evict: 'AbsentFromRender' })
    const view = vi.fn(rowView)
    render(registry, () => lazy('row', view, ['row']))
    render(registry, () => undefined)

    expect(registry.keyedLazyStates.size).toBe(0)
    render(registry, () => lazy('row', view, ['row']))
    expect(view).toHaveBeenCalledTimes(2)
  })

  it.each([false, true])(
    'preserves nested keys through an unchanged parent (keyed: %s)',
    isKeyed => {
      const registry = createBoundaryRegistry()
      const rows = createKeyedLazy({ evict: 'AbsentFromRender' })
      const plainParent = createLazy()
      const keyedParent = createKeyedLazy()
      const row = vi.fn(rowView)
      const parent = vi.fn((labels: ReadonlyArray<string>) =>
        h(
          'ul',
          {},
          Array.map(labels, label => requiredVNode(rows(label, row, [label]))),
        ),
      )
      const show = (labels: ReadonlyArray<string>) =>
        render(registry, () => {
          if (isKeyed) {
            return keyedParent('parent', parent, [labels])
          } else {
            return plainParent(parent, [labels])
          }
        })
      const labels = ['first', 'second']

      const first = show(labels)
      expect(show(labels)).toBe(first)
      expect(show(labels)).toBe(first)
      show(['first', 'second', 'third'])

      expect(row).toHaveBeenCalledTimes(3)
      expect(parent).toHaveBeenCalledTimes(2)
      show([])
      expect(registry.keyedLazyStates.size).toBe(0)
    },
  )

  it('forwards inner cache-hit usages through multiple lazy ancestors', () => {
    const registry = createBoundaryRegistry()
    const rows = createKeyedLazy({ evict: 'AbsentFromRender' })
    const inner = createLazy()
    const outer = createLazy()
    const row = vi.fn(rowView)
    const innerView = () => rows('row', row, ['row'])
    const outerView = (revision: number) =>
      h('div', {}, [requiredVNode(inner(innerView, [])), `${revision}`])
    const show = (revision: number) =>
      render(registry, () => outer(outerView, [revision]))

    show(1)
    show(2)
    show(2)
    render(registry, () => rows('row', row, ['row']))

    expect(row).toHaveBeenCalledTimes(1)
  })

  it('evicts null results after their key is absent', () => {
    const registry = createBoundaryRegistry()
    const lazy = createKeyedLazy({ evict: 'AbsentFromRender' })
    const view = vi.fn(() => null)
    render(registry, () => lazy('empty', view, []))
    render(registry, () => lazy('empty', view, []))
    expect(view).toHaveBeenCalledTimes(1)

    render(registry, () => undefined)
    render(registry, () => lazy('empty', view, []))
    expect(view).toHaveBeenCalledTimes(2)
  })

  it('discards descendants of a lazy view that returns null', () => {
    const registry = createBoundaryRegistry()
    const rows = createKeyedLazy({ evict: 'AbsentFromRender' })
    const parent = createLazy()
    const row = vi.fn(rowView)
    const invisibleView = () => {
      rows('row', row, ['row'])
      return null
    }

    render(registry, () => parent(invisibleView, []))
    render(registry, () => parent(invisibleView, []))
    expect(registry.keyedLazyStates.size).toBe(0)
    render(registry, () => rows('row', row, ['row']))
    expect(row).toHaveBeenCalledTimes(2)
  })

  it.each(['Null', 'Throw'])(
    'restores writes from an abandoned Submodel (%s)',
    failure => {
      const registry = createBoundaryRegistry()
      const rows = createKeyedLazy({ evict: 'AbsentFromRender' })
      const parent = createLazy()
      const row = vi.fn(rowView)
      const previous = render(registry, () => rows('row', row, ['original']))
      const ChildModel = Schema.Struct({})
      const child = defineView<typeof ChildModel.Type, never>(() => {
        rows('row', row, ['discarded'])
        rows('new', row, ['new'])
        if (failure === 'Throw') {
          throw new Error('Failed child view')
        }
        return null
      })
      const parentView = () => {
        rows('row', row, ['original'])
        try {
          html.submodel({
            slotId: 'child',
            model: {},
            view: child,
            toParentMessage: message => message,
          })
        } catch {
          return h('main', {}, ['fallback'])
        }
        return h('main', {}, ['fallback'])
      }

      render(registry, () => parent(parentView, []))
      render(registry, () => parent(parentView, []))
      expect(render(registry, () => rows('row', row, ['original']))).toBe(
        previous,
      )
      render(registry, () => rows('new', row, ['new']))
      expect(row).toHaveBeenCalledTimes(4)
      expect(registry.wraps.size).toBe(0)
    },
  )

  it('restores a previous entry when a root view throws after replacing it', () => {
    const registry = createBoundaryRegistry()
    const rows = createKeyedLazy({ evict: 'AbsentFromRender' })
    const view = vi.fn(rowView)
    const previous = render(registry, () => rows('row', view, ['original']))

    expect(() =>
      render(registry, () => {
        rows('row', view, ['discarded'])
        rows('new', view, ['new'])
        throw new Error('Failed root view')
      }),
    ).toThrow('Failed root view')

    expect(render(registry, () => rows('row', view, ['original']))).toBe(
      previous,
    )
    expect(view).toHaveBeenCalledTimes(3)
    render(registry, () => rows('new', view, ['new']))
    expect(view).toHaveBeenCalledTimes(4)
  })

  it.each(['EmptyRender', 'Release'])(
    'cleans up a previously registered cache after an abandoned pass (%s)',
    cleanup => {
      const registry = createBoundaryRegistry()
      const rows = createKeyedLazy({ evict: 'AbsentFromRender' })
      const view = vi.fn(rowView)
      render(registry, () => rows('row', view, ['row']))

      expect(() =>
        render(registry, () => {
          rows('row', view, ['row'])
          throw new Error('Abandoned pass')
        }),
      ).toThrow('Abandoned pass')

      if (cleanup === 'EmptyRender') {
        render(registry, () => undefined)
      } else {
        clearKeyedLazyCaches(registry)
      }

      render(registry, () => rows('row', view, ['row']))
      expect(view).toHaveBeenCalledTimes(2)
    },
  )

  it('isolates one factory across runtimes and server request registries', () => {
    const firstRegistry = createBoundaryRegistry()
    const secondRegistry = createBoundaryRegistry()
    const lazy = createKeyedLazy({ evict: 'AbsentFromRender' })
    const view = vi.fn(rowView)
    const first = render(firstRegistry, () => lazy('same', view, ['row']))
    const second = render(secondRegistry, () => lazy('same', view, ['row']))

    expect(second).not.toBe(first)
    render(secondRegistry, () => undefined)
    expect(render(firstRegistry, () => lazy('same', view, ['row']))).toBe(first)
    expect(view).toHaveBeenCalledTimes(2)
  })

  it.each([false, true])(
    'isolates enclosing lazy views across registries with shared dispatch (keyed: %s)',
    isKeyed => {
      const firstRegistry = createBoundaryRegistry()
      const secondRegistry = createBoundaryRegistry()
      const rows = createKeyedLazy({ evict: 'AbsentFromRender' })
      const plainParent = createLazy()
      const keyedParent = createKeyedLazy()
      const row = vi.fn(rowView)
      const parent = vi.fn(() =>
        h('ul', {}, [requiredVNode(rows('row', row, ['row']))]),
      )
      const show = (registry: BoundaryRegistry) =>
        render(registry, () => {
          if (isKeyed) {
            return keyedParent('parent', parent, [])
          } else {
            return plainParent(parent, [])
          }
        })

      const first = show(firstRegistry)
      const second = show(secondRegistry)

      expect(second).not.toBe(first)
      expect(parent).toHaveBeenCalledTimes(2)
      expect(row).toHaveBeenCalledTimes(2)
      clearKeyedLazyCaches(secondRegistry)
      show(firstRegistry)
      expect(parent).toHaveBeenCalledTimes(3)
      expect(row).toHaveBeenCalledTimes(2)
    },
  )

  it('clears a released runtime without clearing another runtime', () => {
    const firstRegistry = createBoundaryRegistry()
    const secondRegistry = createBoundaryRegistry()
    const lazy = createKeyedLazy({ evict: 'AbsentFromRender' })
    const view = vi.fn(rowView)
    render(firstRegistry, () => lazy('same', view, ['row']))
    const second = render(secondRegistry, () => lazy('same', view, ['row']))

    clearKeyedLazyCaches(firstRegistry)
    expect(firstRegistry.keyedLazyStates.size).toBe(0)
    expect(render(secondRegistry, () => lazy('same', view, ['row']))).toBe(
      second,
    )
    render(firstRegistry, () => lazy('same', view, ['row']))
    expect(view).toHaveBeenCalledTimes(3)
  })

  it('preserves user hooks when a key receives a replacement VNode', () => {
    const registry = createBoundaryRegistry()
    const lazy = createKeyedLazy({ evict: 'AbsentFromRender' })
    const inserted = vi.fn()
    const destroyed = vi.fn()
    const postdestroyed = vi.fn()
    const view = vi.fn((tag: string) =>
      h(
        tag,
        {
          hook: {
            insert: inserted,
            destroy: destroyed,
            postdestroy: postdestroyed,
          },
        },
        ['row'],
      ),
    )
    const container = document.createElement('div')
    document.body.append(container)
    let current = Option.none<VNode>()
    const show = (tag: string) =>
      render(registry, () => {
        const next = lazy('same', view, [tag])
        const patched = __patchVNode(
          current,
          next,
          container,
          registry.dedupeSeen,
        )
        current = Option.some(patched)
        return next
      })

    try {
      show('section')
      const replacement = show('article')
      expect(show('article')).toBe(replacement)
      expect(inserted).toHaveBeenCalledTimes(2)
      expect(destroyed).toHaveBeenCalledTimes(1)
      expect(postdestroyed).toHaveBeenCalledTimes(1)
      expect(view).toHaveBeenCalledTimes(2)
    } finally {
      const removed = __patchVNode(current, null, container).elm
      removed?.parentNode?.removeChild(removed)
    }
  })
})
