import { eventListenersModule, h, init, toVNode } from 'snabbdom'
import { describe, expect, it } from 'vitest'

import { propsModule } from './propsModule.js'

const patch = init([propsModule, eventListenersModule])

describe('propsModule', () => {
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
