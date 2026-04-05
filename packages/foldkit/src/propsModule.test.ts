import { eventListenersModule, h, init, toVNode } from 'snabbdom'
import { describe, expect, it } from 'vitest'

import { propsModule } from './propsModule'

const patch = init([propsModule])
const patchWithEvents = init([propsModule, eventListenersModule])

describe('propsModule', () => {
  it('sets a property on create', () => {
    const container = document.createElement('div')
    const vnode = h('button', { props: { disabled: true } }, ['Submit'])

    patch(toVNode(container), vnode)

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const button = vnode.elm as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('resets a removed boolean property to false', () => {
    const container = document.createElement('div')
    const vnode1 = h('button', { props: { disabled: true } }, ['Submit'])

    const rendered = patch(toVNode(container), vnode1)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const button = rendered.elm as HTMLButtonElement
    expect(button.disabled).toBe(true)

    const vnode2 = h('button', {}, ['Submit'])
    patch(rendered, vnode2)

    expect(button.disabled).toBe(false)
  })

  it('resets a removed string property to empty string', () => {
    const container = document.createElement('div')
    const vnode1 = h('div', { props: { id: 'my-element' } })

    const rendered = patch(toVNode(container), vnode1)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const element = rendered.elm as HTMLElement
    expect(element.id).toBe('my-element')

    const vnode2 = h('div', {})
    patch(rendered, vnode2)

    expect(element.id).toBe('')
  })

  it('resets a removed number property to zero', () => {
    const container = document.createElement('div')
    const vnode1 = h('div', { props: { tabIndex: 5 } })

    const rendered = patch(toVNode(container), vnode1)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const element = rendered.elm as HTMLElement
    expect(element.tabIndex).toBe(5)

    const vnode2 = h('div', {})
    patch(rendered, vnode2)

    expect(element.tabIndex).toBe(0)
  })

  it('allows a click listener to fire after removing disabled', () => {
    const container = document.createElement('div')
    const vnode1 = h('button', { props: { disabled: true } }, ['Submit'])

    const rendered = patchWithEvents(toVNode(container), vnode1)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const button = rendered.elm as HTMLButtonElement
    expect(button.disabled).toBe(true)

    let clicked = false
    const vnode2 = h(
      'button',
      {
        on: {
          click: () => {
            clicked = true
          },
        },
      },
      ['Submit'],
    )
    patchWithEvents(rendered, vnode2)

    expect(button.disabled).toBe(false)
    button.click()
    expect(clicked).toBe(true)
  })
})
