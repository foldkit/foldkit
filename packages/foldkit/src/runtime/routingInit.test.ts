import { Duration, Effect, Option, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LoadType } from '../navigation/loadType.js'
import {
  expectWorkingSessionStorage,
  nextAnimationFrame,
  replaceSessionStorage,
  reportNavigationTimingType,
  scrollWindowTo,
} from '../test/support/navigation.js'
import type { Url } from '../url/index.js'

const Model = Schema.Struct({ pathname: Schema.String })
type Model = typeof Model.Type

const Flags = Schema.Struct({ theme: Schema.String })
type Flags = typeof Flags.Type

type InitCall = ReadonlyArray<unknown>

const APP_TEXT = 'routing-init-app'
const CONTAINER_ID = 'routing-init-root'
const FLAGS_DELAY = Duration.millis(20)

// NOTE: each test evaluates a fresh copy of the runtime once or twice, which
// takes about half a second per boot on an idle machine and several times that
// when the workspace's suites run in parallel.
const BOOT_TEST_TIMEOUT_MS = 30_000
const BOOT_WAIT_TIMEOUT_MS = 10_000

// NOTE: every boot imports a fresh copy of the runtime, the way a reload
// evaluates the page's modules again. Positions recorded before the reload
// reach the new copy only through sessionStorage.
const importRoutingRuntime = async () => {
  vi.resetModules()
  const { makeApplication } = await import('./makeApplication.js')
  const { embed, run } = await import('./start.js')
  const { defineMessageUnion } = await import('../message/index.js')
  const { __htmlBuilder } = await import('../html/index.js')
  const { UrlRequest } = await import('../navigation/urlRequest.js')

  const Message = defineMessageUnion({
    ClickedLink: { request: UrlRequest },
    ChangedUrl: { pathname: Schema.String },
  })
  type Message = typeof Message.Type
  const h = __htmlBuilder<Message>()

  const initCalls: Array<InitCall> = []
  const container = document.createElement('div')
  container.id = CONTAINER_ID
  document.body.appendChild(container)

  const sharedConfig = {
    Model,
    update: (model: Model) => ({ model }),
    view: (model: Model) => ({
      title: model.pathname,
      body: h.div([], [`${APP_TEXT}:${model.pathname}`]),
    }),
    container,
    routing: {
      onUrlRequest: (request: typeof UrlRequest.Type) =>
        Message.ClickedLink({ request }),
      onUrlChange: ({ pathname }: Url) => Message.ChangedUrl({ pathname }),
    },
  }

  return { Message, makeApplication, embed, run, sharedConfig, initCalls }
}

const waitForRender = async (): Promise<void> => {
  await vi.waitFor(
    () => {
      expect(document.body.textContent).toContain(
        `${APP_TEXT}:${window.location.pathname}`,
      )
    },
    { timeout: BOOT_WAIT_TIMEOUT_MS },
  )
  await nextAnimationFrame()
}

const bootRoutingApplication = async (
  isFlagsApplication: boolean,
): Promise<ReadonlyArray<InitCall>> => {
  const { Message, makeApplication, run, sharedConfig, initCalls } =
    await importRoutingRuntime()
  type Message = typeof Message.Type

  if (isFlagsApplication) {
    run(
      makeApplication<Model, Message, Flags>({
        ...sharedConfig,
        Flags,
        init: (flags: Flags, url: Url, loadType: LoadType) => {
          initCalls.push([flags, url.pathname, loadType])
          return { model: { pathname: url.pathname } }
        },
      }),
      {
        flags: Effect.sleep(FLAGS_DELAY).pipe(Effect.as({ theme: 'Dark' })),
      },
    )
  } else {
    run(
      makeApplication<Model, Message>({
        ...sharedConfig,
        init: (url: Url, loadType: LoadType) => {
          initCalls.push([url.pathname, loadType])
          return { model: { pathname: url.pathname } }
        },
      }),
    )
  }

  await waitForRender()

  return initCalls
}

// NOTE: a browser skips a listener that was removed earlier in the same
// dispatch, and happy-dom still calls it. On a `pagehide` that unloads the
// page, the runtime's teardown removes the history entry tracker's own
// `pagehide` listener before it runs, so these tests follow the browser and
// leave the teardown as the only path that saves positions.
const skipPageHideListenersRemovedDuringDispatch = (): void => {
  const wrappedListeners = new Map<
    EventListenerOrEventListenerObject,
    EventListener
  >()
  const addEventListener = window.addEventListener.bind(window)
  const removeEventListener = window.removeEventListener.bind(window)

  vi.spyOn(window, 'addEventListener').mockImplementation(
    (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type !== 'pagehide') {
        addEventListener(type, listener, options)
        return
      }

      const wrappedListener: EventListener = event => {
        if (wrappedListeners.get(listener) !== wrappedListener) {
          return
        }

        if (typeof listener === 'function') {
          listener(event)
        } else {
          listener.handleEvent(event)
        }
      }
      wrappedListeners.set(listener, wrappedListener)
      addEventListener(type, wrappedListener, options)
    },
  )

  vi.spyOn(window, 'removeEventListener').mockImplementation(
    (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ) => {
      const wrappedListener = wrappedListeners.get(listener)

      if (type !== 'pagehide' || wrappedListener === undefined) {
        removeEventListener(type, listener, options)
        return
      }

      wrappedListeners.delete(listener)
      removeEventListener(type, wrappedListener, options)
    },
  )
}

const unloadPage = async (): Promise<void> => {
  window.dispatchEvent(new Event('pagehide'))
  await vi.waitFor(
    () => {
      expect(document.body.textContent).not.toContain(APP_TEXT)
    },
    { timeout: BOOT_WAIT_TIMEOUT_MS },
  )
  document.body.innerHTML = ''
}

beforeEach(() => {
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/articles')
  skipPageHideListenersRemovedDuringDispatch()
})

afterEach(async () => {
  await unloadPage()
  vi.restoreAllMocks()
  expectWorkingSessionStorage()
  window.sessionStorage.clear()
})

describe('routing init', { timeout: BOOT_TEST_TIMEOUT_MS }, () => {
  it('receives Reload with the position recorded before the page unloaded', async () => {
    await bootRoutingApplication(false)
    scrollWindowTo(0, 2400)
    await unloadPage()

    reportNavigationTimingType('reload')
    const initCalls = await bootRoutingApplication(false)

    expect(initCalls).toEqual([
      [
        '/articles',
        LoadType.Reload({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 2400 }),
        }),
      ],
    ])
  })

  it('receives Flags, the URL, and the LoadType when the application resolves its Flags asynchronously', async () => {
    await bootRoutingApplication(true)
    scrollWindowTo(0, 1200)
    await unloadPage()

    reportNavigationTimingType('reload')
    const initCalls = await bootRoutingApplication(true)

    expect(initCalls).toEqual([
      [
        { theme: 'Dark' },
        '/articles',
        LoadType.Reload({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 1200 }),
        }),
      ],
    ])
  })

  it('receives Traverse with the stored position for a back_forward navigation', async () => {
    await bootRoutingApplication(false)
    scrollWindowTo(0, 700)
    await unloadPage()

    reportNavigationTimingType('back_forward')
    const initCalls = await bootRoutingApplication(false)

    expect(initCalls).toEqual([
      [
        '/articles',
        LoadType.Traverse({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 700 }),
        }),
      ],
    ])
  })

  it('receives Traverse with the position saved when the page entered the back/forward cache', async () => {
    await bootRoutingApplication(false)
    scrollWindowTo(0, 900)
    window.dispatchEvent(
      Object.assign(new Event('pagehide'), { persisted: true }),
    )
    const realSessionStorage = window.sessionStorage
    const fullSessionStorage = replaceSessionStorage({
      getItem: key => realSessionStorage.getItem(key),
      setItem: () => {
        throw new Error('storage is full')
      },
    })
    await unloadPage()
    fullSessionStorage.mockRestore()

    reportNavigationTimingType('back_forward')
    const initCalls = await bootRoutingApplication(false)

    expect(initCalls).toEqual([
      [
        '/articles',
        LoadType.Traverse({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 900 }),
        }),
      ],
    ])
  })

  it('receives Push for a navigate navigation', async () => {
    reportNavigationTimingType('navigate')

    const initCalls = await bootRoutingApplication(false)

    expect(initCalls).toEqual([['/articles', LoadType.Push()]])
  })

  it('boots and unloads when sessionStorage throws, reporting no position', async () => {
    const storageError = new Error('storage is blocked')
    const setItem = vi.fn<Storage['setItem']>(() => {
      throw storageError
    })
    replaceSessionStorage({
      getItem: () => {
        throw storageError
      },
      setItem,
    })
    window.history.replaceState({ foldkitEntryKey: 'entry' }, '', '/articles')
    reportNavigationTimingType('reload')

    const initCalls = await bootRoutingApplication(false)
    await unloadPage()

    expect(initCalls).toEqual([
      [
        '/articles',
        LoadType.Reload({ maybeSavedScrollPosition: Option.none() }),
      ],
    ])
    expect(setItem).toHaveBeenCalled()
  })

  it('never scrolls the window or writes history.scrollRestoration from boot to unload', async () => {
    const scrollRestorationSetter = vi.spyOn(
      window.history,
      'scrollRestoration',
      'set',
    )
    const scroll = vi.spyOn(window, 'scroll')
    const scrollBy = vi.spyOn(window, 'scrollBy')
    const scrollTo = vi.spyOn(window, 'scrollTo')
    reportNavigationTimingType('reload')

    await bootRoutingApplication(false)
    const { pushUrl } = await import('../navigation/index.js')
    scrollWindowTo(0, 800)
    Effect.runSync(pushUrl('/articles/next'))
    window.history.back()
    await nextAnimationFrame()
    await nextAnimationFrame()
    await unloadPage()

    expect(scrollRestorationSetter).not.toHaveBeenCalled()
    expect(scroll).not.toHaveBeenCalled()
    expect(scrollBy).not.toHaveBeenCalled()
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('receives Push when the application starts again in the same page', async () => {
    await bootRoutingApplication(false)
    scrollWindowTo(0, 600)
    await unloadPage()
    reportNavigationTimingType('reload')
    const { Message, makeApplication, embed, sharedConfig, initCalls } =
      await importRoutingRuntime()
    type Message = typeof Message.Type
    const { pushUrl } = await import('../navigation/index.js')
    const program = makeApplication<Model, Message>({
      ...sharedConfig,
      init: (url: Url, loadType: LoadType) => {
        initCalls.push([url.pathname, loadType])
        return { model: { pathname: url.pathname } }
      },
    })

    const firstHandle = embed(program)
    await waitForRender()
    Effect.runSync(pushUrl('/articles/next'))
    scrollWindowTo(0, 1234)
    firstHandle.dispose()
    const secondHandle = embed(program)
    await vi.waitFor(
      () => {
        expect(initCalls).toHaveLength(2)
      },
      { timeout: BOOT_WAIT_TIMEOUT_MS },
    )
    secondHandle.dispose()

    expect(initCalls).toEqual([
      [
        '/articles',
        LoadType.Reload({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 600 }),
        }),
      ],
      ['/articles/next', LoadType.Push()],
    ])
  })

  it('receives Reload in the next start when a start is disposed while its Flags resolve', async () => {
    await bootRoutingApplication(false)
    scrollWindowTo(0, 900)
    await unloadPage()
    reportNavigationTimingType('reload')
    const { Message, makeApplication, embed, sharedConfig, initCalls } =
      await importRoutingRuntime()
    type Message = typeof Message.Type
    const program = makeApplication<Model, Message, Flags>({
      ...sharedConfig,
      Flags,
      init: (flags: Flags, url: Url, loadType: LoadType) => {
        initCalls.push([flags, url.pathname, loadType])
        return { model: { pathname: url.pathname } }
      },
    })
    let isFirstFlagsResolving = false

    const firstHandle = embed(program, {
      flags: Effect.sync(() => {
        isFirstFlagsResolving = true
      }).pipe(Effect.andThen(Effect.never)),
    })
    await vi.waitFor(
      () => {
        expect(isFirstFlagsResolving).toBe(true)
      },
      { timeout: BOOT_WAIT_TIMEOUT_MS },
    )
    firstHandle.dispose()
    const secondHandle = embed(program, {
      flags: Effect.sleep(FLAGS_DELAY).pipe(Effect.as({ theme: 'Dark' })),
    })
    await vi.waitFor(
      () => {
        expect(initCalls).toHaveLength(1)
      },
      { timeout: BOOT_WAIT_TIMEOUT_MS },
    )
    secondHandle.dispose()

    expect(initCalls).toEqual([
      [
        { theme: 'Dark' },
        '/articles',
        LoadType.Reload({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 900 }),
        }),
      ],
    ])
  })

  it('receives Push in the next start when a start restores a preserved Model', async () => {
    await bootRoutingApplication(false)
    scrollWindowTo(0, 1100)
    await unloadPage()
    reportNavigationTimingType('reload')
    const resolvePreservedModel = vi
      .fn<typeof import('./modelPreservationBridge.js').resolvePreservedModel>()
      .mockReturnValueOnce(Effect.succeed({ pathname: '/articles' }))
      .mockReturnValue(Effect.succeed(undefined))
    vi.doMock('./modelPreservationBridge.js', async importOriginal => ({
      ...(await importOriginal<
        typeof import('./modelPreservationBridge.js')
      >()),
      resolvePreservedModel,
    }))
    const { Message, makeApplication, embed, sharedConfig, initCalls } =
      await importRoutingRuntime()
    vi.doUnmock('./modelPreservationBridge.js')
    type Message = typeof Message.Type
    const program = makeApplication<Model, Message>({
      ...sharedConfig,
      init: (url: Url, loadType: LoadType) => {
        initCalls.push([url.pathname, loadType])
        return { model: { pathname: url.pathname } }
      },
    })

    const firstHandle = embed(program)
    await waitForRender()
    firstHandle.dispose()
    const secondHandle = embed(program)
    await vi.waitFor(
      () => {
        expect(initCalls).toHaveLength(1)
      },
      { timeout: BOOT_WAIT_TIMEOUT_MS },
    )
    secondHandle.dispose()

    expect(resolvePreservedModel).toHaveBeenCalledTimes(2)
    expect(initCalls).toEqual([['/articles', LoadType.Push()]])
  })

  it('receives Push when the browser has no navigation timing entry', async () => {
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([])

    const initCalls = await bootRoutingApplication(false)

    expect(initCalls).toEqual([['/articles', LoadType.Push()]])
  })
})
