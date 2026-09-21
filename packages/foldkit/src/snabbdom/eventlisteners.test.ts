import { describe, expect, it } from 'vitest'

import { eventListenersModule } from './eventlisteners.js'
import { h } from './h.js'
import { init } from './init.js'
import type { VNode } from './vnode.js'

const patch = init([eventListenersModule])

const elementOf = (node: VNode): HTMLButtonElement => {
  if (!(node.elm instanceof HTMLButtonElement)) {
    throw new Error('Expected a button')
  }
  return node.elm
}

describe('eventListenersModule', () => {
  it('retargets a reused handler through replacement, removal, and readdition', () => {
    const seen: Array<VNode> = []
    const sharedOn = {
      click: (_event: MouseEvent, node: VNode) => seen.push(node),
    }
    const mounted = patch(
      document.createElement('div'),
      h('button', { on: sharedOn }),
    )
    const button = elementOf(mounted)

    const cloned = patch(mounted, h('button', { on: sharedOn }))
    button.click()
    expect(seen).toEqual([cloned])

    const changed = patch(
      cloned,
      h('button', {
        on: { click: (_event: MouseEvent, node: VNode) => seen.push(node) },
      }),
    )
    button.click()
    expect(seen).toEqual([cloned, changed])

    const removed = patch(changed, h('button', {}))
    button.click()
    expect(seen).toEqual([cloned, changed])

    const readded = patch(
      removed,
      h('button', {
        on: { click: (_event: MouseEvent, node: VNode) => seen.push(node) },
      }),
    )
    button.click()
    expect(seen).toEqual([cloned, changed, readded])
  })
})
