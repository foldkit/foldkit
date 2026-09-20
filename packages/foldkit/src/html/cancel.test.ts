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
  CanceledDialog: {},
})
type Message = typeof Message.Type

const setUpRuntime = (dispatched: Array<unknown>): void => {
  const dispatchSync: DispatchSync = message => {
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

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const cancelHandlerOf = (
  vnode: ReturnType<HtmlBuilder<Message>['dialog']>,
): ((event: Event) => void) =>
  vnode?.data?.on?.['cancel'] as unknown as (event: Event) => void
/* eslint-enable @typescript-eslint/consistent-type-assertions */

describe('cancel attributes', () => {
  let dispatched: Array<unknown>

  beforeEach(() => {
    dispatched = []
    setUpRuntime(dispatched)
  })

  afterEach(() => {
    clearRuntime()
  })

  it('OnCancelPreventDefault prevents default without dispatching', () => {
    const h = __htmlBuilder<Message>()
    const vnode = h.dialog([h.OnCancelPreventDefault()])
    const event = new Event('cancel', { cancelable: true })

    cancelHandlerOf(vnode)(event)

    expect(event.defaultPrevented).toBe(true)
    expect(dispatched).toEqual([])
  })

  it('OnCancel prevents default and dispatches', () => {
    const h = __htmlBuilder<Message>()
    const vnode = h.dialog([h.OnCancel(Message.CanceledDialog())])
    const event = new Event('cancel', { cancelable: true })

    cancelHandlerOf(vnode)(event)

    expect(event.defaultPrevented).toBe(true)
    expect(dispatched).toEqual([Message.CanceledDialog()])
  })

  it('distinguishes a native cancel event from a CustomEvent signal', () => {
    const h = __htmlBuilder<Message>()
    const vnode = h.dialog([h.OnCancelPreventDefault(Message.CanceledDialog())])
    const nativeCancel = new Event('cancel', { cancelable: true })

    cancelHandlerOf(vnode)(nativeCancel)

    expect(nativeCancel.defaultPrevented).toBe(true)
    expect(dispatched).toEqual([])

    const escapeSignal = new CustomEvent('cancel', { cancelable: true })

    cancelHandlerOf(vnode)(escapeSignal)

    expect(escapeSignal.defaultPrevented).toBe(true)
    expect(dispatched).toEqual([Message.CanceledDialog()])
  })
})
