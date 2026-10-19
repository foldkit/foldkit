// @vitest-environment happy-dom
import {
  Deferred,
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

import { CopyPayloadToClipboard, createOverlay } from './overlay.js'

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
  recordResolvedCommand: () => Effect.void,
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

const startOverlay = (store: DevToolsStore) =>
  Effect.runFork(
    Effect.scoped(
      Effect.gen(function* () {
        yield* createOverlay(store, 'BottomRight', 'TimeTravel', Option.none())
        return yield* Effect.never
      }),
    ),
  )

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
    const overlayFiber = startOverlay(store)

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
  it('copies the displayed Model, Message, Command, and Mount payloads', async () => {
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
    const snippetId = 'core/devtools-snippet-devtoolsExcludeFromHistory-3'
    const storeState: StoreState = {
      ...initialStoreState,
      entries: [
        {
          tag: 'GotProfileMessage',
          message: inspectedMessage,
          commands: [
            {
              id: 0,
              name: 'SaveProfile',
              args: { userId: 42 },
              maybeSubmodelPath: Option.none(),
            },
            { id: 1, name: 'RefreshProfile', maybeSubmodelPath: Option.none() },
          ],
          mountStarts: [{ name: 'MeasureSnippetHeight', args: { snippetId } }],
          mountEnds: [{ name: 'ReleaseProfile' }],
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

    const overlayFiber = startOverlay(store)

    const copyFromInspector = async (
      tabIndex: number,
      rowIndex: number,
      payload: unknown,
      callNumber: number,
      subject: string,
    ) => {
      const tab = await vi.waitFor(() => {
        const tab = overlayShadow().querySelector<HTMLButtonElement>(
          `#dt-inspector-tab-${tabIndex}`,
        )
        expect(tab).not.toBeNull()
        return tab
      })
      tab?.click()

      const button = await vi.waitFor(() => {
        expect(tab?.getAttribute('aria-selected')).toBe('true')
        const button = overlayShadow()
          .querySelectorAll<HTMLButtonElement>(
            `#dt-inspector-panel-${tabIndex} .dt-copy-button`,
          )
          .item(rowIndex)
        expect(button).not.toBeNull()
        expect(button?.getAttribute('aria-label')).toBe(
          `Copy ${subject} as JSON`,
        )
        return button
      })
      button?.click()

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledTimes(callNumber)
        expect(writeText).toHaveBeenNthCalledWith(
          callNumber,
          JSON.stringify(payload, null, 2),
        )
      })
    }

    try {
      await copyFromInspector(0, 0, inspectedModel, 1, 'Model payload')
      await copyFromInspector(
        1,
        0,
        inspectedMessage.message,
        2,
        'Message payload',
      )
      await copyFromInspector(
        2,
        0,
        { userId: 42, _tag: 'SaveProfile' },
        3,
        'Command 1 (SaveProfile) payload',
      )
      await copyFromInspector(
        2,
        1,
        { _tag: 'RefreshProfile' },
        4,
        'Command 2 (RefreshProfile) payload',
      )
      await copyFromInspector(
        3,
        0,
        { snippetId, _tag: 'MeasureSnippetHeight' },
        5,
        'Started Mount 1 (MeasureSnippetHeight) payload',
      )
      await copyFromInspector(
        3,
        1,
        { _tag: 'ReleaseProfile' },
        6,
        'Ended Mount 1 (ReleaseProfile) payload',
      )
    } finally {
      await Effect.runPromise(Fiber.interrupt(overlayFiber))
    }
  })

  it('removes the click handler while copying and showing confirmation', async () => {
    const inspectedModel = { count: 1 }
    const storeState: StoreState = {
      ...initialStoreState,
      maybeLatestModel: Option.some(inspectedModel),
    }
    const stateRef = await Effect.runPromise(SubscriptionRef.make(storeState))
    const store = makeStore(stateRef, { inspectedModel })
    const firstWrite = Deferred.makeUnsafe<void>()
    const writeText = vi.fn(() => Effect.runPromise(Deferred.await(firstWrite)))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    localStorage.setItem('foldkit-devtools', JSON.stringify({ isOpen: true }))

    const overlayFiber = startOverlay(store)

    try {
      const button = await vi.waitFor(() => {
        const button = overlayShadow().querySelector<HTMLButtonElement>(
          '#dt-inspector-panel-0 .dt-copy-button',
        )
        if (button === null) {
          throw new Error('Expected the Model copy button to exist')
        }
        return button
      })
      const removeClickListener = vi.spyOn(button, 'removeEventListener')
      const addClickListener = vi.spyOn(button, 'addEventListener')
      const copyIconPath = button.querySelector('path')?.getAttribute('d')
      button.click()

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledOnce()
        expect(button.getAttribute('aria-label')).toBe(
          'Copying Model payload as JSON',
        )
        expect(button.getAttribute('aria-disabled')).toBe('true')
        expect(removeClickListener).toHaveBeenCalledWith(
          'click',
          expect.any(Function),
          false,
        )
      })
      button.click()
      expect(writeText).toHaveBeenCalledOnce()

      Effect.runSync(Deferred.succeed(firstWrite, undefined))

      await vi.waitFor(() => {
        expect(button.getAttribute('aria-label')).toBe(
          'Copied Model payload as JSON',
        )
        expect(button.getAttribute('aria-disabled')).toBe('true')
        expect(button.nextElementSibling?.getAttribute('role')).toBe('status')
        expect(button.nextElementSibling?.textContent).toBe(
          'Copied to clipboard',
        )
        expect(button.classList.contains('dt-copy-success')).toBe(true)
        expect(button.querySelector('path')?.getAttribute('d')).not.toBe(
          copyIconPath,
        )
      })
      expect(addClickListener).not.toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        false,
      )
      button.click()
      expect(writeText).toHaveBeenCalledOnce()

      await vi.waitFor(
        () => {
          expect(button.getAttribute('aria-label')).toBe(
            'Copy Model payload as JSON',
          )
          expect(button.getAttribute('aria-disabled')).toBe('false')
          expect(button.nextElementSibling?.textContent).toBe('')
          expect(button.querySelector('path')?.getAttribute('d')).toBe(
            copyIconPath,
          )
          expect(addClickListener).toHaveBeenCalledWith(
            'click',
            expect.any(Function),
            false,
          )
        },
        { timeout: 2000 },
      )
      removeClickListener.mockRestore()
      addClickListener.mockRestore()
    } finally {
      await Effect.runPromise(Fiber.interrupt(overlayFiber))
    }
  })

  it('returns a failure Message when a payload cannot be serialized', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const result = await Effect.runPromise(
      CopyPayloadToClipboard({
        targetId: 'Model:0',
        requestId: 1,
        payload: { count: 1n },
      }).effect,
    )

    expect(result).toEqual({
      _tag: 'FailedCopyPayloadToClipboard',
      targetId: 'Model:0',
      requestId: 1,
    })
    expect(writeText).not.toHaveBeenCalled()
  })

  it('returns a failure Message when clipboard access is denied', async () => {
    const writeText = vi.fn(() => Promise.reject(new Error('Denied')))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const result = await Effect.runPromise(
      CopyPayloadToClipboard({
        targetId: 'Model:0',
        requestId: 1,
        payload: { count: 1 },
      }).effect,
    )

    expect(result).toEqual({
      _tag: 'FailedCopyPayloadToClipboard',
      targetId: 'Model:0',
      requestId: 1,
    })
    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify({ count: 1 }, null, 2),
    )
  })
})
