import { Context } from 'effect'
import { afterEach, beforeEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import { html } from './index.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from './runtimeSingleton.js'

const setUpRuntime = (dispatched: Array<unknown>): void => {
  const dispatchSync: DispatchSync = message => {
    dispatched.push(message)
  }
  const dispatchService = Dispatch.of({
    dispatchAsync: () =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      Promise.resolve() as unknown as ReturnType<
        typeof Dispatch.Service.dispatchAsync
      >,
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

type ClosedDialog = Readonly<{ _tag: 'ClosedDialog' }>

const ClosedDialog = (): ClosedDialog => ({ _tag: 'ClosedDialog' })

type Message = ClosedDialog

const fakeCancelEvent = () => {
  let isDefaultPrevented = false
  return {
    event: {
      preventDefault: () => {
        isDefaultPrevented = true
      },
    },
    isDefaultPrevented: () => isDefaultPrevented,
  }
}

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const handlerOf = (
  vnode: ReturnType<ReturnType<typeof html<Message>>['dialog']>,
  eventName: string,
): ((event: unknown) => void) =>
  vnode?.data?.on?.[eventName] as unknown as (event: unknown) => void
/* eslint-enable @typescript-eslint/consistent-type-assertions */

describe('OnCancelPreventDefault', () => {
  let dispatched: Array<unknown>

  beforeEach(() => {
    dispatched = []
    setUpRuntime(dispatched)
  })

  afterEach(() => {
    clearRuntime()
  })

  it('prevents default without dispatching', () => {
    const h = html<Message>()
    const vnode = h.dialog([h.OnCancelPreventDefault()], [])

    const fake = fakeCancelEvent()
    handlerOf(vnode, 'cancel')(fake.event)

    expect(fake.isDefaultPrevented()).toBe(true)
    expect(dispatched).toEqual([])
  })

  it('prevents default and dispatches with OnCancel for contrast', () => {
    const h = html<Message>()
    const vnode = h.dialog([h.OnCancel(ClosedDialog())], [])

    const fake = fakeCancelEvent()
    handlerOf(vnode, 'cancel')(fake.event)

    expect(fake.isDefaultPrevented()).toBe(true)
    expect(dispatched).toEqual([{ _tag: 'ClosedDialog' }])
  })
})
