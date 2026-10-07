import {
  Effect,
  Fiber,
  HashMap,
  HashSet,
  Option,
  SubscriptionRef,
} from 'effect'
import { DEVTOOLS_HOST_ID } from 'foldkit/devtools-host'
import { expect, it, vi } from 'vitest'

import { overlay } from '@foldkit/devtools/vite'

const initialStoreState = {
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

const makeStore = stateRef => ({
  recordInit: () => Effect.void,
  recordMessage: () => Effect.void,
  recordResolvedCommand: () => Effect.void,
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

const matchMedia = () => ({
  matches: false,
  media: '',
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
})

it('starts the overlay and responds to store updates', async () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: matchMedia,
  })
  const stateRef = await Effect.runPromise(
    SubscriptionRef.make(initialStoreState),
  )
  const overlayFiber = Effect.runFork(
    Effect.scoped(
      Effect.gen(function* () {
        yield* overlay(
          makeStore(stateRef),
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
      const shadow = document.getElementById(DEVTOOLS_HOST_ID)?.shadowRoot
      expect(shadow).toBeDefined()
    })
    await Effect.runPromise(
      SubscriptionRef.update(stateRef, state => ({
        ...state,
        isPaused: true,
        pausedAtIndex: -1,
      })),
    )
    await vi.waitFor(() => {
      const blocker = document
        .getElementById(DEVTOOLS_HOST_ID)
        ?.shadowRoot?.querySelector('.dt-interaction-blocker')
      expect(blocker).not.toBeNull()
    })
  } finally {
    await Effect.runPromise(Fiber.interrupt(overlayFiber))
  }
})
