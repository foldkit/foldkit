import { Effect, Fiber, Option } from 'effect'
import { TestClock } from 'effect/testing'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { setup } from '../test/vitest.js'
import {
  __setModelPreservationHotContext,
  resolvePreservedModel,
} from './modelPreservationBridge.js'

const makeHotContext = () => {
  const listeners = new Set<(message: unknown) => void>()
  const requests: Array<Readonly<{ event: string; message: unknown }>> = []
  const hot = {
    on: (_event: string, handler: (message: unknown) => void) => {
      listeners.add(handler)
    },
    off: (_event: string, handler: (message: unknown) => void) => {
      listeners.delete(handler)
    },
    send: (event: string, message: unknown) => {
      requests.push({ event, message })
    },
  }
  const restore = (message: unknown): void => {
    for (const listener of listeners) {
      listener(message)
    }
  }
  return { hot, requests, listeners, restore }
}

afterEach(() => {
  __setModelPreservationHotContext(undefined)
  vi.restoreAllMocks()
})

describe('Vitest setup', () => {
  it('resolves without a preserved Model synchronously when HMR is available', () => {
    const transport = makeHotContext()
    __setModelPreservationHotContext(transport.hot)
    const warning = vi.spyOn(console, 'warn')

    setup()

    expect(Effect.runSync(resolvePreservedModel('app'))).toBeUndefined()
    expect(transport.requests).toEqual([])
    expect(transport.listeners.size).toBe(0)
    expect(warning).not.toHaveBeenCalled()
  })

  it('can be called repeatedly and registers the Scene matchers', () => {
    setup()
    setup()

    expect(Effect.runSync(resolvePreservedModel('app'))).toBeUndefined()
    expect(Option.none()).toBeAbsent()
  })
})

describe('resolvePreservedModel', () => {
  it('resolves synchronously without an HMR transport', () => {
    __setModelPreservationHotContext(undefined)

    expect(Effect.runSync(resolvePreservedModel('app'))).toBeUndefined()
  })

  it.effect('requests and restores the Model for the matching runtime', () =>
    Effect.gen(function* () {
      const transport = makeHotContext()
      __setModelPreservationHotContext(transport.hot)
      const fiber = yield* Effect.forkChild(resolvePreservedModel('app'))
      yield* Effect.yieldNow

      expect(transport.requests).toEqual([
        { event: 'foldkit:request-model', message: { id: 'app' } },
      ])
      transport.restore({ id: 'other', model: { count: 1 } })
      transport.restore({ invalid: true })
      expect(fiber.pollUnsafe()).toBeUndefined()

      transport.restore({ id: 'app', model: { count: 7 } })
      expect(yield* Fiber.join(fiber)).toEqual({ count: 7 })
      expect(transport.listeners.size).toBe(0)
    }),
  )

  it.effect('waits 500 ms and warns when the plugin does not respond', () =>
    Effect.gen(function* () {
      const transport = makeHotContext()
      __setModelPreservationHotContext(transport.hot)
      const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fiber = yield* Effect.forkChild(resolvePreservedModel('app'))

      yield* TestClock.adjust(499)
      expect(fiber.pollUnsafe()).toBeUndefined()
      expect(warning).not.toHaveBeenCalled()

      yield* TestClock.adjust(1)
      expect(yield* Fiber.join(fiber)).toBeUndefined()
      expect(warning).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('No response from @foldkit/vite-plugin'),
      )
      expect(transport.listeners.size).toBe(0)
    }),
  )

  it.effect('removes the response listener on interruption', () =>
    Effect.gen(function* () {
      const transport = makeHotContext()
      __setModelPreservationHotContext(transport.hot)
      const fiber = yield* Effect.forkChild(resolvePreservedModel('app'))
      yield* Effect.yieldNow
      expect(transport.listeners.size).toBe(1)

      yield* Fiber.interrupt(fiber)
      expect(transport.listeners.size).toBe(0)
    }),
  )
})
