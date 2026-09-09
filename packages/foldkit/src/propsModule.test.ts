import { describe, expect, it } from 'vitest'

import { propsModule } from './propsModule.js'
import { eventListenersModule, h, init, toVNode } from './snabbdom/index.js'

const patch = init([propsModule, eventListenersModule])

describe('propsModule', () => {
  it('writes draggable as an enumerated attribute on a custom element', () => {
    const container = document.createElement('div')
    const enabled = patch(
      toVNode(container),
      h('x-draggable', { props: { draggable: true } }),
    )
    const element = enabled.elm
    if (!(element instanceof HTMLElement)) {
      throw new Error('expected a custom HTML element')
    }

    expect(element.getAttribute('draggable')).toBe('true')

    patch(enabled, h('x-draggable', { props: { draggable: false } }))

    expect(element.getAttribute('draggable')).toBe('false')
  })

  it('resets disabled on the DOM element when the prop is removed', () => {
    const container = document.createElement('div')

    const disabled = h('button', { props: { disabled: true } }, ['Submit'])
    const rendered = patch(toVNode(container), disabled)

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const button = rendered.elm as HTMLButtonElement
    expect(button.disabled).toBe(true)

    const enabled = h('button', { on: { click: () => {} } }, ['Submit'])
    patch(rendered, enabled)

    expect(button.disabled).toBe(false)
  })
})
