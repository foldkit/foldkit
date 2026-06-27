import { Context, Option } from 'effect'
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

type PressedKey = Readonly<{ _tag: 'PressedKey'; key: string }>

const PressedKey = (key: string): PressedKey => ({ _tag: 'PressedKey', key })

type Message = PressedKey

const fakeKeyboardEvent = (
  key: string,
  origin: 'self' | 'descendant',
): {
  event: unknown
  isDefaultPrevented: () => boolean
} => {
  let isDefaultPrevented = false
  const host = {}
  const child = {}
  return {
    event: {
      key,
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      target: origin === 'self' ? host : child,
      currentTarget: host,
      preventDefault: () => {
        isDefaultPrevented = true
      },
    },
    isDefaultPrevented: () => isDefaultPrevented,
  }
}

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const handlerOf = (
  vnode: ReturnType<ReturnType<typeof html<Message>>['div']>,
  eventName: string,
): ((event: unknown) => void) =>
  vnode?.data?.on?.[eventName] as unknown as (event: unknown) => void
/* eslint-enable @typescript-eslint/consistent-type-assertions */

describe('keyboard self-scoped attributes', () => {
  let dispatched: Array<unknown>

  beforeEach(() => {
    dispatched = []
    setUpRuntime(dispatched)
  })

  afterEach(() => {
    clearRuntime()
  })

  describe('OnKeyDownSelf', () => {
    it('dispatches when the keydown targets the element itself', () => {
      const h = html<Message>()
      const vnode = h.div([h.OnKeyDownSelf(key => PressedKey(key))], [])

      handlerOf(vnode, 'keydown')(fakeKeyboardEvent('a', 'self').event)

      expect(dispatched).toEqual([{ _tag: 'PressedKey', key: 'a' }])
    })

    it('ignores keydowns that bubble up from a descendant', () => {
      const h = html<Message>()
      const vnode = h.div([h.OnKeyDownSelf(key => PressedKey(key))], [])

      handlerOf(vnode, 'keydown')(fakeKeyboardEvent('a', 'descendant').event)

      expect(dispatched).toEqual([])
    })
  })

  describe('OnKeyDownSelfPreventDefault', () => {
    it('prevents default and dispatches for a self event when the handler returns Some', () => {
      const h = html<Message>()
      const vnode = h.div(
        [
          h.OnKeyDownSelfPreventDefault(key =>
            key === 'Enter' ? Option.some(PressedKey(key)) : Option.none(),
          ),
        ],
        [],
      )

      const fake = fakeKeyboardEvent('Enter', 'self')
      handlerOf(vnode, 'keydown')(fake.event)

      expect(fake.isDefaultPrevented()).toBe(true)
      expect(dispatched).toEqual([{ _tag: 'PressedKey', key: 'Enter' }])
    })

    it('leaves the key to the browser for a self event when the handler returns None', () => {
      const h = html<Message>()
      const vnode = h.div(
        [
          h.OnKeyDownSelfPreventDefault(key =>
            key === 'Enter' ? Option.some(PressedKey(key)) : Option.none(),
          ),
        ],
        [],
      )

      const fake = fakeKeyboardEvent('a', 'self')
      handlerOf(vnode, 'keydown')(fake.event)

      expect(fake.isDefaultPrevented()).toBe(false)
      expect(dispatched).toEqual([])
    })

    it('does not fire or prevent default for a descendant event', () => {
      const h = html<Message>()
      const vnode = h.div(
        [
          h.OnKeyDownSelfPreventDefault(key =>
            // Would claim every key if it ran, so a quiet result proves the
            // descendant guard short-circuits before the handler.
            Option.some(PressedKey(key)),
          ),
        ],
        [],
      )

      const fake = fakeKeyboardEvent('Enter', 'descendant')
      handlerOf(vnode, 'keydown')(fake.event)

      expect(fake.isDefaultPrevented()).toBe(false)
      expect(dispatched).toEqual([])
    })
  })
})
