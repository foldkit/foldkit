import { Context, Effect, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import { eventListenersModule, init, toVNode } from '../snabbdom/index.js'
import {
  PointerPosition,
  __htmlBuilder,
  __clearRuntime as clearHtmlRuntime,
  __setRuntime as setHtmlRuntime,
} from './index.js'

const patch = init([eventListenersModule])

const Message = defineMessageUnion({
  OpenedMenu: { position: PointerPosition, isShiftHeld: Schema.Boolean },
})
type Message = typeof Message.Type

describe('OnContextMenu', () => {
  it('measures the pointer against the handler element when a descendant is right-clicked', () => {
    const dispatched: Array<unknown> = []
    const dispatch = Dispatch.of({
      dispatchAsync: () => Effect.void,
      dispatchSync: message => {
        dispatched.push(message)
      },
    })
    setHtmlRuntime(
      dispatch.dispatchSync,
      Context.make(Dispatch, dispatch).pipe(
        Context.add(MountTracker, { started: () => {}, ended: () => {} }),
      ),
    )

    const h = __htmlBuilder<Message>()
    const view = h.div(
      [
        h.OnContextMenu((position, { shiftKey }) =>
          Message.OpenedMenu({ position, isShiftHeld: shiftKey }),
        ),
      ],
      [h.span([], ['Week 3'])],
    )
    clearHtmlRuntime()

    if (view === null) {
      throw new Error('the view rendered nothing')
    }

    const bar = patch(toVNode(document.createElement('div')), view).elm

    if (!(bar instanceof Element) || bar.firstElementChild === null) {
      throw new Error('patch did not render the bar and its label')
    }

    const label = bar.firstElementChild
    bar.getBoundingClientRect = () => new DOMRect(100, 50, 400, 20)
    label.getBoundingClientRect = () => new DOMRect(300, 50, 100, 20)

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 320,
      clientY: 55,
      shiftKey: true,
    })
    label.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(dispatched).toStrictEqual([
      Message.OpenedMenu({
        position: {
          clientX: 320,
          clientY: 55,
          elementX: 220,
          elementY: 5,
          elementWidth: 400,
          elementHeight: 20,
        },
        isShiftHeld: true,
      }),
    ])
  })
})
