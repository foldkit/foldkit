import { Context, Effect } from 'effect'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import { type HtmlBuilder, __htmlBuilder } from './index.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from './runtimeSingleton.js'

const Message = defineMessageUnion({
  ClickedFirst: {},
  ClickedSecond: {},
})
type Message = typeof Message.Type

const setUpRuntime = (
  dispatched: Array<unknown>,
  activeElementsAtDispatch: Array<Element | null>,
): void => {
  const dispatchSync: DispatchSync = message => {
    activeElementsAtDispatch.push(document.activeElement)
    dispatched.push(message)
  }
  const dispatchService = Dispatch.of({
    dispatchAsync: () => Effect.void,
    dispatchSync,
  })
  const context = Context.make(Dispatch, dispatchService).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )
  setRuntime(dispatchSync, context)
}

const fakeClick = () => {
  let isDefaultPrevented = false
  let isPropagationStopped = false

  return {
    event: {
      preventDefault: () => {
        isDefaultPrevented = true
      },
      stopPropagation: () => {
        isPropagationStopped = true
      },
    },
    isDefaultPrevented: () => isDefaultPrevented,
    isPropagationStopped: () => isPropagationStopped,
  }
}

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const clickHandlerOf = (
  vnode: ReturnType<HtmlBuilder<Message>['button']>,
): ((event: unknown) => void) =>
  vnode?.data?.on?.['click'] as unknown as (event: unknown) => void
/* eslint-enable @typescript-eslint/consistent-type-assertions */

describe('OnClick', () => {
  let dispatched: Array<unknown>
  let activeElementsAtDispatch: Array<Element | null>
  let focusTarget: HTMLInputElement

  beforeEach(() => {
    dispatched = []
    activeElementsAtDispatch = []
    focusTarget = document.createElement('input')
    focusTarget.id = 'click-focus-target'
    document.body.appendChild(focusTarget)
    setUpRuntime(dispatched, activeElementsAtDispatch)
  })

  afterEach(() => {
    focusTarget.remove()
    clearRuntime()
  })

  it('allows the default and bubbling when controls are omitted', () => {
    const h = __htmlBuilder<Message>()
    const vnode = h.button([h.OnClick(Message.ClickedFirst())])
    const click = fakeClick()

    clickHandlerOf(vnode)(click.event)

    expect(click.isDefaultPrevented()).toBe(false)
    expect(click.isPropagationStopped()).toBe(false)
    expect(dispatched).toEqual([Message.ClickedFirst()])
  })

  it('combines default prevention, stopped propagation, and focus', () => {
    const h = __htmlBuilder<Message>()
    const vnode = h.button([
      h.OnClick(Message.ClickedFirst(), {
        defaultAction: 'Prevent',
        propagation: 'Stop',
        focusSelector: '#click-focus-target',
      }),
    ])
    const click = fakeClick()

    clickHandlerOf(vnode)(click.event)

    expect(click.isDefaultPrevented()).toBe(true)
    expect(click.isPropagationStopped()).toBe(true)
    expect(document.activeElement).toBe(focusTarget)
    expect(activeElementsAtDispatch).toEqual([focusTarget])
    expect(dispatched).toEqual([Message.ClickedFirst()])
  })

  it('runs every handler on the current element after propagation stops', () => {
    const h = __htmlBuilder<Message>()
    const vnode = h.button([
      h.OnClick(Message.ClickedFirst(), { propagation: 'Stop' }),
      h.OnClick(Message.ClickedSecond()),
    ])
    const click = fakeClick()

    clickHandlerOf(vnode)(click.event)

    expect(click.isPropagationStopped()).toBe(true)
    expect(dispatched).toEqual([
      Message.ClickedFirst(),
      Message.ClickedSecond(),
    ])
  })
})
