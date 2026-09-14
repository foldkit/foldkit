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
  {
    inspectedModel = {},
    maybeInspectedMessage = Option.none(),
  }: Readonly<{
    inspectedModel?: unknown
    maybeInspectedMessage?: Option.Option<unknown>
  }> = {},
): DevToolsStore => ({
  recordInit: () => Effect.void,
  recordMessage: () => Effect.void,
  updateLatestModel: () => Effect.void,
  attachRenderedMounts: () => Effect.void,
  getModelAtIndex: () => Effect.succeed(inspectedModel),
  getMessageAtIndex: () => Effect.succeed(maybeInspectedMessage),
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

describe('DevTools payload copy', () => {
  it('copies the displayed Model, Message, and Command payloads', async () => {
    const inspectedModel = {
      profile: {
        name: 'Ada',
        preferences: { theme: 'Dark' },
      },
    }
    const inspectedMessage = {
      _tag: 'GotProfileMessage',
      message: {
        _tag: 'UpdatedTheme',
        theme: 'Light',
      },
    }
    const storeState: StoreState = {
      ...initialStoreState,
      entries: [
        {
          tag: 'GotProfileMessage',
          message: inspectedMessage,
          commands: [
            { name: 'SaveProfile', args: { userId: 42 } },
            { name: 'RefreshProfile' },
          ],
          mountStarts: [{ name: 'FocusProfile', args: { field: 'name' } }],
          mountEnds: [],
          timestamp: 100,
          isModelChanged: true,
          diff: {
            changedPaths: HashSet.empty(),
            affectedPaths: HashSet.empty(),
          },
        },
      ],
      maybeLatestModel: Option.some(inspectedModel),
    }
    const stateRef = await Effect.runPromise(SubscriptionRef.make(storeState))
    const store = makeStore(stateRef, {
      inspectedModel,
      maybeInspectedMessage: Option.some(inspectedMessage),
    })
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    localStorage.setItem(
      'foldkit-devtools',
      JSON.stringify({ isOpen: true, isFlattened: true }),
    )

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
      const modelCopyButton = await vi.waitFor(() => {
        const button = overlayShadow().querySelector<HTMLButtonElement>(
          '#dt-inspector-panel-0 button[aria-label="Copy payload as JSON"]',
        )
        expect(button).not.toBeNull()
        return button
      })

      modelCopyButton?.click()

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(
          JSON.stringify(inspectedModel, null, 2),
        )
      })

      writeText.mockClear()
      overlayShadow()
        .querySelector<HTMLButtonElement>('#dt-inspector-tab-1')
        ?.click()

      const messageCopyButton = await vi.waitFor(() => {
        expect(
          overlayShadow()
            .querySelector('#dt-inspector-tab-1')
            ?.getAttribute('aria-selected'),
        ).toBe('true')
        const button = overlayShadow().querySelector<HTMLButtonElement>(
          '#dt-inspector-panel-1 button[aria-label="Copy payload as JSON"]',
        )
        expect(button).not.toBeNull()
        return button
      })

      messageCopyButton?.click()

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(
          JSON.stringify(inspectedMessage.message, null, 2),
        )
      })

      writeText.mockClear()
      overlayShadow()
        .querySelector<HTMLButtonElement>('#dt-inspector-tab-2')
        ?.click()

      const commandCopyButtons = await vi.waitFor(() => {
        expect(
          overlayShadow()
            .querySelector('#dt-inspector-tab-2')
            ?.getAttribute('aria-selected'),
        ).toBe('true')
        const buttons = overlayShadow().querySelectorAll<HTMLButtonElement>(
          '#dt-inspector-panel-2 button[aria-label="Copy payload as JSON"]',
        )
        expect(buttons).toHaveLength(2)
        return buttons
      })

      commandCopyButtons.item(0).click()

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(
          JSON.stringify({ userId: 42, _tag: 'SaveProfile' }, null, 2),
        )
      })

      writeText.mockClear()
      commandCopyButtons.item(1).click()

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(
          JSON.stringify({ _tag: 'RefreshProfile' }, null, 2),
        )
      })

      overlayShadow()
        .querySelector<HTMLButtonElement>('#dt-inspector-tab-3')
        ?.click()

      await vi.waitFor(() => {
        expect(
          overlayShadow()
            .querySelector('#dt-inspector-tab-3')
            ?.getAttribute('aria-selected'),
        ).toBe('true')
        expect(
          overlayShadow().querySelectorAll(
            '#dt-inspector-panel-3 button[aria-label="Copy payload as JSON"]',
          ),
        ).toHaveLength(0)
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(overlayFiber))
    }
  })

  it('keeps rendering when a payload cannot be represented as JSON', async () => {
    const stateRef = await Effect.runPromise(
      SubscriptionRef.make(initialStoreState),
    )
    const store = makeStore(stateRef, {
      inspectedModel: { count: 1n },
    })
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    localStorage.setItem(
      'foldkit-devtools',
      JSON.stringify({ isOpen: true, isFlattened: false }),
    )

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
      const copyButton = await vi.waitFor(() => {
        const button = overlayShadow().querySelector<HTMLButtonElement>(
          '#dt-inspector-panel-0 button[aria-label="Copy payload as JSON"]',
        )
        expect(button).not.toBeNull()
        return button
      })

      copyButton?.click()

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(writeText).not.toHaveBeenCalled()
      expect(copyButton?.isConnected).toBe(true)
    } finally {
      await Effect.runPromise(Fiber.interrupt(overlayFiber))
    }
  })
})
