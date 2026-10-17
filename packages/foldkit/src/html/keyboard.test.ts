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
  composition: Readonly<{
    isComposing: boolean
    keyCode: number
  }> = { isComposing: false, keyCode: 0 },
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
      isComposing: composition.isComposing,
      keyCode: composition.keyCode,
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

describe('IME composition keydowns', () => {
  let dispatched: Array<unknown>

  beforeEach(() => {
    dispatched = []
    setUpRuntime(dispatched)
  })

  afterEach(() => {
    clearRuntime()
  })

  const composing = { isComposing: true, keyCode: 0 }
  const compositionKeyCode = { isComposing: false, keyCode: 229 }

  it('OnKeyDownPreventDefault still claims an ordinary Enter', () => {
    const h = __htmlBuilder<Message>()
    const vnode = h.div([
      h.OnKeyDownPreventDefault(key =>
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

  it('leaves a composing keydown to the input method', () => {
    const h = __htmlBuilder<Message>()
    const handlers = [
      {
        name: 'OnKeyDown',
        vnode: h.div([h.OnKeyDown(key => Message.PressedKey({ key }))]),
      },
      {
        name: 'OnKeyDownPreventDefault',
        vnode: h.div([
          h.OnKeyDownPreventDefault(() =>
            Option.some(Message.PressedKey({ key: 'Enter' })),
          ),
        ]),
      },
      {
        name: 'OnKeyDownSelf',
        vnode: h.div([h.OnKeyDownSelf(key => Message.PressedKey({ key }))]),
      },
      {
        name: 'OnKeyDownSelfPreventDefault',
        vnode: h.div([
          h.OnKeyDownSelfPreventDefault(() =>
            Option.some(Message.PressedKey({ key: 'Enter' })),
          ),
        ]),
      },
      {
        name: 'OnKeyDownFocus',
        vnode: h.div([
          h.OnKeyDownFocus(() =>
            Option.some({
              focusSelector: '#missing',
              message: Message.PressedKey({ key: 'Enter' }),
            }),
          ),
        ]),
      },
    ]

    for (const handler of handlers) {
      dispatched.splice(0, dispatched.length)
      const fake = fakeKeyboardEvent('Enter', 'self', composing)
      handlerOf(handler.vnode, 'keydown')(fake.event)

      expect(fake.isDefaultPrevented(), handler.name).toBe(false)
      expect(dispatched, handler.name).toEqual([])
    }
  })

  it('leaves a keyCode 229 keydown to the input method', () => {
    const h = __htmlBuilder<Message>()
    const vnode = h.div([
      h.OnKeyDownPreventDefault(() =>
        Option.some(Message.PressedKey({ key: 'Enter' })),
      ),
    ])

    const fake = fakeKeyboardEvent('Enter', 'self', compositionKeyCode)
    handlerOf(vnode, 'keydown')(fake.event)

    expect(fake.isDefaultPrevented()).toBe(false)
    expect(dispatched).toEqual([])
  })
})
