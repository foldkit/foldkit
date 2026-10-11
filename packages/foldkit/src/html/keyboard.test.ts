import { Context, Effect, Option, Schema } from 'effect'
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

const Message = defineMessageUnion({
  PressedKey: { key: Schema.String },
})
type Message = typeof Message.Type

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
      get defaultPrevented() {
        return isDefaultPrevented
      },
      preventDefault: () => {
        isDefaultPrevented = true
      },
    },
    isDefaultPrevented: () => isDefaultPrevented,
  }
}

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const handlerOf = (
  vnode: ReturnType<HtmlBuilder<Message>['div']>,
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
      const h = __htmlBuilder<Message>()
      const vnode = h.div([h.OnKeyDownSelf(key => Message.PressedKey({ key }))])

      handlerOf(vnode, 'keydown')(fakeKeyboardEvent('a', 'self').event)

      expect(dispatched).toEqual([{ _tag: 'PressedKey', key: 'a' }])
    })

    it('ignores keydowns that bubble up from a descendant', () => {
      const h = __htmlBuilder<Message>()
      const vnode = h.div([h.OnKeyDownSelf(key => Message.PressedKey({ key }))])

      handlerOf(vnode, 'keydown')(fakeKeyboardEvent('a', 'descendant').event)

      expect(dispatched).toEqual([])
    })
  })

  describe('OnKeyDownSelfPreventDefault', () => {
    it('prevents default and dispatches for a self event when the handler returns Some', () => {
      const h = __htmlBuilder<Message>()
      const vnode = h.div([
        h.OnKeyDownSelfPreventDefault(key =>
          key === 'Enter'
            ? Option.some(Message.PressedKey({ key }))
            : Option.none(),
        ),
      ])

      const fake = fakeKeyboardEvent('Enter', 'self')
      handlerOf(vnode, 'keydown')(fake.event)

      expect(fake.isDefaultPrevented()).toBe(true)
      expect(dispatched).toEqual([{ _tag: 'PressedKey', key: 'Enter' }])
    })

    it('leaves the key to the browser for a self event when the handler returns None', () => {
      const h = __htmlBuilder<Message>()
      const vnode = h.div([
        h.OnKeyDownSelfPreventDefault(key =>
          key === 'Enter'
            ? Option.some(Message.PressedKey({ key }))
            : Option.none(),
        ),
      ])

      const fake = fakeKeyboardEvent('a', 'self')
      handlerOf(vnode, 'keydown')(fake.event)

      expect(fake.isDefaultPrevented()).toBe(false)
      expect(dispatched).toEqual([])
    })

    it('does not fire or prevent default for a descendant event', () => {
      const h = __htmlBuilder<Message>()
      const vnode = h.div([
        h.OnKeyDownSelfPreventDefault(key =>
          Option.some(Message.PressedKey({ key })),
        ),
      ])

      const fake = fakeKeyboardEvent('Enter', 'descendant')
      handlerOf(vnode, 'keydown')(fake.event)

      expect(fake.isDefaultPrevented()).toBe(false)
      expect(dispatched).toEqual([])
    })
  })
})

describe('keydowns an earlier handler already claimed', () => {
  let dispatched: Array<unknown>

  beforeEach(() => {
    dispatched = []
    setUpRuntime(dispatched)
  })

  afterEach(() => {
    clearRuntime()
  })

  const claimedKeydown = (
    origin: 'self' | 'descendant',
  ): ReturnType<typeof fakeKeyboardEvent> => {
    const h = __htmlBuilder<Message>()
    const nested = h.div([
      h.OnKeyDownPreventDefault(key =>
        Option.some(Message.PressedKey({ key: `nested ${key}` })),
      ),
    ])
    const fake = fakeKeyboardEvent('Escape', origin)
    handlerOf(nested, 'keydown')(fake.event)

    return fake
  }

  it('OnKeyDownPreventDefault leaves the keydown to the handler that claimed it', () => {
    const h = __htmlBuilder<Message>()
    const outer = h.div([
      h.OnKeyDownPreventDefault(key =>
        Option.some(Message.PressedKey({ key: `outer ${key}` })),
      ),
    ])

    const fake = claimedKeydown('descendant')
    handlerOf(outer, 'keydown')(fake.event)

    expect(dispatched).toEqual([{ _tag: 'PressedKey', key: 'nested Escape' }])
  })

  it('OnKeyDownSelfPreventDefault leaves the keydown to the handler that claimed it', () => {
    const h = __htmlBuilder<Message>()
    const host = h.div([
      h.OnKeyDownSelfPreventDefault(key =>
        Option.some(Message.PressedKey({ key: `host ${key}` })),
      ),
    ])

    const fake = claimedKeydown('self')
    handlerOf(host, 'keydown')(fake.event)

    expect(dispatched).toEqual([{ _tag: 'PressedKey', key: 'nested Escape' }])
  })

  it('OnKeyDownFocus leaves the keydown to the handler that claimed it', () => {
    const h = __htmlBuilder<Message>()
    const outer = h.div([
      h.OnKeyDownFocus(key =>
        Option.some({
          focusSelector: '#missing',
          message: Message.PressedKey({ key: `outer ${key}` }),
        }),
      ),
    ])

    const fake = claimedKeydown('descendant')
    handlerOf(outer, 'keydown')(fake.event)

    expect(dispatched).toEqual([{ _tag: 'PressedKey', key: 'nested Escape' }])
  })

  it('OnKeyDown still reports a keydown that another handler claimed', () => {
    const h = __htmlBuilder<Message>()
    const outer = h.div([
      h.OnKeyDown(key => Message.PressedKey({ key: `outer ${key}` })),
    ])

    const fake = claimedKeydown('descendant')
    handlerOf(outer, 'keydown')(fake.event)

    expect(dispatched).toEqual([
      { _tag: 'PressedKey', key: 'nested Escape' },
      { _tag: 'PressedKey', key: 'outer Escape' },
    ])
  })
})
