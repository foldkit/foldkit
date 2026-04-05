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

  it('resets disabled inside a keyed parent whose children go from empty to populated', () => {
    const container = document.createElement('div')

    const dialogClosed = h('dialog', { key: 'dlg' }, [])
    const rendered1 = patchWithEvents(toVNode(container), dialogClosed)

    const dialogOpenDisabled = h('dialog', { key: 'dlg' }, [
      h('div', { key: 'dlg-backdrop' }, []),
      h('div', { key: 'dlg-panel' }, [
        h('button', { props: { disabled: true } }, ['Submit']),
      ]),
    ])
    const rendered2 = patchWithEvents(rendered1, dialogOpenDisabled)

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const panel = rendered2.children![1] as {
      children: Array<{ elm: HTMLButtonElement }>
    }
    const button = panel.children[0].elm
    expect(button.disabled).toBe(true)

    let clicked = false
    const dialogOpenClickable = h('dialog', { key: 'dlg' }, [
      h('div', { key: 'dlg-backdrop' }, []),
      h('div', { key: 'dlg-panel' }, [
        h(
          'button',
          {
            on: {
              click: () => {
                clicked = true
              },
            },
          },
          ['Submit'],
        ),
      ]),
    ])
    patchWithEvents(rendered2, dialogOpenClickable)

    expect(button.disabled).toBe(false)
    button.click()
    expect(clicked).toBe(true)
  })

  it('resets disabled when button is nested inside conditional content', () => {
    const container = document.createElement('div')

    const withDisabled = h('div', { key: 'panel' }, [
      h('div', {}, [
        h('p', {}, ['Help text']),
        h(
          'button',
          { class: { 'bg-slate-100': true }, props: { disabled: true } },
          ['Submit'],
        ),
      ]),
    ])
    const rendered1 = patchWithEvents(toVNode(container), withDisabled)

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const wrapper = rendered1.children![0] as {
      children: Array<{ elm: HTMLElement }>
    }
    const button = wrapper.children[1].elm
    expect(button).toBeInstanceOf(HTMLButtonElement)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    expect((button as HTMLButtonElement).disabled).toBe(true)

    let clicked = false
    const withOnClick = h('div', { key: 'panel' }, [
      h('div', {}, [
        h('p', {}, ['Help text']),
        h(
          'button',
          {
            class: { 'bg-red-600': true },
            on: {
              click: () => {
                clicked = true
              },
            },
          },
          ['Submit'],
        ),
      ]),
    ])
    patchWithEvents(rendered1, withOnClick)

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    expect((button as HTMLButtonElement).disabled).toBe(false)
    button.click()
    expect(clicked).toBe(true)
  })
})
