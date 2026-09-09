// @vitest-environment happy-dom
import {
  Effect,
  Fiber,
  HashMap,
  HashSet,
  Option,
  SubscriptionRef,
} from 'effect'
import { DEVTOOLS_HOST_ID } from 'foldkit/devtools-host'
import type { DevToolsStore, StoreState } from 'foldkit/devtools-host'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createOverlay } from './overlay.js'

const initialStoreState: StoreState = {
  entries: [],
  keyframes: HashMap.make([0, {}]),
  maybeInitModel: Option.some({}),
  initCommands: [],
  initMountStarts: [],
  startIndex: 0,
  isPaused: false,
  pausedAtIndex: 0,
  maybeLatestModel: Option.some({}),
}

const makeStore = (
  stateRef: SubscriptionRef.SubscriptionRef<StoreState>,
): DevToolsStore => ({
  recordInit: () => Effect.void,
  recordMessage: () => Effect.void,
  updateLatestModel: () => Effect.void,
  attachRenderedMounts: () => Effect.void,
  getModelAtIndex: () => Effect.succeed({}),
  getMessageAtIndex: () => Effect.succeed(Option.none()),
  getDiffAtIndex: () =>
    Effect.succeed({
      changedPaths: HashSet.empty(),
      affectedPaths: HashSet.empty(),
    }),
  jumpTo: () => Effect.succeed({}),
  resume: Effect.void,
  clear: Effect.void,
  stateRef,
})

const matchMedia = (): MediaQueryList => ({
  matches: false,
  media: '',
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
})

const overlayShadow = (): ShadowRoot => {
  const host = document.getElementById(DEVTOOLS_HOST_ID)
  if (host?.shadowRoot === null || host?.shadowRoot === undefined) {
    throw new Error('Expected the DevTools shadow root to exist')
  }
  return host.shadowRoot
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: matchMedia,
  })
  localStorage.clear()
})

afterEach(() => {
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  localStorage.clear()
})

describe('DevTools interaction blocker', () => {
  it('covers the application while time travel is paused', async () => {
    const stateRef = await Effect.runPromise(
      SubscriptionRef.make(initialStoreState),
    )
    const store = makeStore(stateRef)
    const overlayFiber = Effect.runFork(
      Effect.scoped(
        Effect.gen(function* () {
          yield* createOverlay(
            store,
            'BottomRight',
            'TimeTravel',
            Option.none(),
          )
          return yield* Effect.never
        }),
      ),
    )

    try {
      await vi.waitFor(() => {
        expect(overlayShadow()).toBeDefined()
      })
      expect(
        overlayShadow().querySelector('.dt-interaction-blocker'),
      ).toBeNull()

      await Effect.runPromise(
        SubscriptionRef.update(stateRef, state => ({
          ...state,
          isPaused: true,
          pausedAtIndex: -1,
        })),
      )

      await vi.waitFor(() => {
        expect(
          overlayShadow().querySelector('.dt-interaction-blocker'),
        ).not.toBeNull()
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(overlayFiber))
    }
  })
})
