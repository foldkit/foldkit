import { Array, Effect, Option } from 'effect'
import { type Mock, afterEach, beforeAll, beforeEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { pushUrl, replaceUrl } from '../navigation/index.js'
import { UrlChangeType } from '../navigation/urlChangeType.js'
import { type UrlRequest } from '../navigation/urlRequest.js'
import { type CommitNotifier, createCommitNotifier } from '../render/commit.js'
import {
  entryKeyInHistoryState,
  expectWorkingSessionStorage,
  nextAnimationFrame,
  replaceSessionStorage,
  scrollWindowTo,
} from '../test/support/navigation.js'
import { type Url } from '../url/index.js'
import {
  type RoutingConfig,
  addLinkClickListener,
  addNavigationEventListeners,
} from './browserListeners.js'

declare global {
  interface Window {
    happyDOM?: {
      settings: {
        navigation: { disableMainFrameNavigation: boolean }
      }
    }
  }
}

const dispatched: Array<UrlRequest> = []

const dispatch = (request: UrlRequest) => {
  dispatched.push(request)
}

const onUrlChange = (_url: Url): UrlRequest => {
  throw new Error('onUrlChange should not be called by the link-click handler')
}

const routingConfig: RoutingConfig<UrlRequest> = {
  onUrlRequest: request => request,
  onUrlChange,
}

const makeLink = (
  href: string,
  attributes: Readonly<{ target?: string; download?: boolean }> = {},
): HTMLAnchorElement => {
  const link = document.createElement('a')
  link.href = href
  if (attributes.target !== undefined) {
    link.target = attributes.target
  }
  if (attributes.download === true) {
    link.setAttribute('download', '')
  }
  document.body.appendChild(link)
  return link
}

const click = (
  link: HTMLAnchorElement,
  options: MouseEventInit = {},
): MouseEvent => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...options,
  })
  link.dispatchEvent(event)
  return event
}

describe('addLinkClickListener', () => {
  beforeAll(() => {
    // NOTE: happy-dom follows links whose default isn't prevented. Without
    // this, the fall-through tests would trigger a real fetch to the link's
    // href and log ECONNREFUSED every time they pass.
    if (window.happyDOM !== undefined) {
      window.happyDOM.settings.navigation.disableMainFrameNavigation = true
    }

    addLinkClickListener(dispatch, routingConfig)
  })

  beforeEach(() => {
    dispatched.length = 0
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('preventDefaults and dispatches Internal for a plain left-click on a same-origin link', () => {
    const link = makeLink(`${window.location.origin}/about`)
    const event = click(link)

    expect(event.defaultPrevented).toBe(true)
    expect(dispatched).toMatchObject([{ _tag: 'Internal' }])
  })

  it('preventDefaults and dispatches External for a plain left-click on a cross-origin link', () => {
    const link = makeLink('https://example.com/news')
    const event = click(link)

    expect(event.defaultPrevented).toBe(true)
    expect(dispatched).toMatchObject([
      { _tag: 'External', href: 'https://example.com/news' },
    ])
  })

  it('captures a click on an element nested inside the link', () => {
    const link = makeLink(`${window.location.origin}/about`)
    const span = document.createElement('span')
    link.appendChild(span)

    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
    })
    span.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(dispatched).toMatchObject([{ _tag: 'Internal' }])
  })

  it('falls through on cmd/meta-click so the browser can open a new tab', () => {
    const link = makeLink(`${window.location.origin}/about`)
    const event = click(link, { metaKey: true })

    expect(event.defaultPrevented).toBe(false)
    expect(dispatched).toHaveLength(0)
  })

  it('falls through on ctrl-click', () => {
    const link = makeLink(`${window.location.origin}/about`)
    const event = click(link, { ctrlKey: true })

    expect(event.defaultPrevented).toBe(false)
    expect(dispatched).toHaveLength(0)
  })

  it('falls through on shift-click', () => {
    const link = makeLink(`${window.location.origin}/about`)
    const event = click(link, { shiftKey: true })

    expect(event.defaultPrevented).toBe(false)
    expect(dispatched).toHaveLength(0)
  })

  it('falls through on alt-click', () => {
    const link = makeLink(`${window.location.origin}/about`)
    const event = click(link, { altKey: true })

    expect(event.defaultPrevented).toBe(false)
    expect(dispatched).toHaveLength(0)
  })

  it('falls through on middle-click', () => {
    const link = makeLink(`${window.location.origin}/about`)
    const event = click(link, { button: 1 })

    expect(event.defaultPrevented).toBe(false)
    expect(dispatched).toHaveLength(0)
  })

  it('falls through on right-click', () => {
    const link = makeLink(`${window.location.origin}/about`)
    const event = click(link, { button: 2 })

    expect(event.defaultPrevented).toBe(false)
    expect(dispatched).toHaveLength(0)
  })

  it('falls through on a link with target="_blank"', () => {
    const link = makeLink(`${window.location.origin}/about`, {
      target: '_blank',
    })
    const event = click(link)

    expect(event.defaultPrevented).toBe(false)
    expect(dispatched).toHaveLength(0)
  })

  it('captures a link with target="_self" (explicit default)', () => {
    const link = makeLink(`${window.location.origin}/about`, {
      target: '_self',
    })
    const event = click(link)

    expect(event.defaultPrevented).toBe(true)
    expect(dispatched).toMatchObject([{ _tag: 'Internal' }])
  })

  it('falls through on a link with a download attribute', () => {
    const link = makeLink(`${window.location.origin}/file.zip`, {
      download: true,
    })
    const event = click(link)

    expect(event.defaultPrevented).toBe(false)
    expect(dispatched).toHaveLength(0)
  })

  it('falls through when an upstream handler has already called preventDefault', () => {
    const link = makeLink(`${window.location.origin}/about`)
    document.body.addEventListener(
      'click',
      event => {
        event.preventDefault()
      },
      { capture: true, once: true },
    )

    const event = click(link)

    expect(dispatched).toHaveLength(0)
    expect(event.defaultPrevented).toBe(true)
  })
})

describe('addNavigationEventListeners', () => {
  const urlChanges: Array<Readonly<[string, UrlChangeType]>> = []
  let commitNotifier: CommitNotifier = createCommitNotifier()
  let removeListeners = (): void => {}
  let resumeScrollReadsAfterBoot = (): void => {}

  // NOTE: every dispatched URL change dirties the Model in a real app, so the
  // dispatch stands in for update by leaving a render pending until a test
  // commits it.
  const listen = (): void => {
    commitNotifier = createCommitNotifier()
    const navigationEventListeners = addNavigationEventListeners(
      () => commitNotifier.markCommitPending(),
      {
        onUrlRequest: () => undefined,
        onUrlChange: (url, urlChangeType) => {
          urlChanges.push([url.pathname, urlChangeType])
          return undefined
        },
      },
      commitNotifier.service,
    )
    removeListeners = navigationEventListeners.removeListeners
    resumeScrollReadsAfterBoot =
      navigationEventListeners.resumeScrollReadsAfterBoot
  }

  const listenAndSettleStartup = async (): Promise<void> => {
    listen()
    resumeScrollReadsAfterBoot()
    await nextAnimationFrame()
  }

  const commitRenderAndSettle = async (): Promise<void> => {
    commitNotifier.notifyCommitted()
    await nextAnimationFrame()
  }

  const traverseTo = (pathname: string, state: unknown): void => {
    window.history.replaceState(state, '', pathname)
    window.dispatchEvent(new PopStateEvent('popstate', { state }))
  }

  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState(null, '', '/a')
  })

  afterEach(() => {
    removeListeners()
    removeListeners = () => {}
    resumeScrollReadsAfterBoot = () => {}
    urlChanges.length = 0
    vi.restoreAllMocks()
    expectWorkingSessionStorage()
    window.sessionStorage.clear()
  })

  it('reports Push for pushUrl, then Traverse with the position the reader left', async () => {
    await listenAndSettleStartup()
    scrollWindowTo(0, 800)
    const entryAState = window.history.state

    Effect.runSync(pushUrl('/b'))
    scrollWindowTo(0, 0)
    traverseTo('/a', entryAState)

    expect(urlChanges).toEqual([
      ['/b', UrlChangeType.Push()],
      [
        '/a',
        UrlChangeType.Traverse({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 800 }),
        }),
      ],
    ])
  })

  it('reports Replace for replaceUrl and keeps the entry key', () => {
    listen()
    const entryKeyBeforeReplace = entryKeyInHistoryState()

    Effect.runSync(replaceUrl('/c'))

    expect(urlChanges).toEqual([['/c', UrlChangeType.Replace()]])
    expect(entryKeyInHistoryState()).toEqual(expect.any(String))
    expect(entryKeyInHistoryState()).toBe(entryKeyBeforeReplace)
  })

  it('gives each entry pushUrl creates its own key', () => {
    listen()
    const entryKeyBeforePush = entryKeyInHistoryState()

    Effect.runSync(pushUrl('/b'))

    expect(entryKeyBeforePush).toEqual(expect.any(String))
    expect(window.history.state).toEqual({
      foldkitEntryKey: expect.any(String),
    })
    expect(entryKeyInHistoryState()).not.toBe(entryKeyBeforePush)
  })

  it('reports Traverse without a position for an entry that has no key, and gives it one', () => {
    listen()

    traverseTo('/elsewhere', null)

    expect(urlChanges).toEqual([
      [
        '/elsewhere',
        UrlChangeType.Traverse({ maybeSavedScrollPosition: Option.none() }),
      ],
    ])
    expect(entryKeyInHistoryState()).toEqual(expect.any(String))
  })

  it('reports a native fragment navigation as Traverse without a position', async () => {
    await listenAndSettleStartup()
    scrollWindowTo(0, 600)

    window.history.pushState(null, '', '/a#details')
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }))

    expect(urlChanges).toEqual([
      [
        '/a',
        UrlChangeType.Traverse({ maybeSavedScrollPosition: Option.none() }),
      ],
    ])
    expect(entryKeyInHistoryState()).toEqual(expect.any(String))
  })

  it('keeps the other properties of a keyless entry it gives a key', () => {
    listen()

    traverseTo('/elsewhere', { scrollOwner: 'host' })

    expect(urlChanges).toEqual([
      [
        '/elsewhere',
        UrlChangeType.Traverse({ maybeSavedScrollPosition: Option.none() }),
      ],
    ])
    expect(window.history.state).toEqual({
      scrollOwner: 'host',
      foldkitEntryKey: expect.any(String),
    })
  })

  it('writes only the key for a keyless entry whose state is not a plain object', () => {
    listen()

    traverseTo('/elsewhere', new Uint8Array([7, 9]))
    const typedArrayEntryState = window.history.state
    traverseTo('/other', new Map([['scrollOwner', 'host']]))
    const mapEntryState = window.history.state

    expect(typedArrayEntryState).toEqual({
      foldkitEntryKey: expect.any(String),
    })
    expect(mapEntryState).toEqual({ foldkitEntryKey: expect.any(String) })
  })

  it('records the position from the last scroll event, not the one the browser restored before popstate', () => {
    listen()
    const entryAState = window.history.state
    Effect.runSync(pushUrl('/b'))
    scrollWindowTo(0, 1500)
    const entryBState = window.history.state

    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(300)
    traverseTo('/a', entryAState)
    traverseTo('/b', entryBState)

    expect(urlChanges).toContainEqual([
      '/b',
      UrlChangeType.Traverse({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 1500 }),
      }),
    ])
  })

  it('reads no scroll position at startup until a frame after the runtime boots', async () => {
    listen()
    const scrollYGetter = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0)

    window.dispatchEvent(new Event('scroll'))
    await nextAnimationFrame()
    await nextAnimationFrame()
    window.dispatchEvent(new Event('scroll'))
    expect(scrollYGetter).not.toHaveBeenCalled()

    resumeScrollReadsAfterBoot()
    expect(scrollYGetter).not.toHaveBeenCalled()

    await nextAnimationFrame()
    expect(scrollYGetter).toHaveBeenCalled()
  })

  it('reads no scroll position after a traversal until a frame after its render commits, however late', async () => {
    await listenAndSettleStartup()
    const entryAState = window.history.state
    Effect.runSync(pushUrl('/b'))
    await commitRenderAndSettle()
    traverseTo('/a', entryAState)
    const scrollYGetter = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0)

    window.dispatchEvent(new Event('scroll'))
    await nextAnimationFrame()
    await nextAnimationFrame()
    await nextAnimationFrame()
    window.dispatchEvent(new Event('scroll'))
    expect(scrollYGetter).not.toHaveBeenCalled()

    commitNotifier.notifyCommitted()
    expect(scrollYGetter).not.toHaveBeenCalled()

    await nextAnimationFrame()
    expect(scrollYGetter).toHaveBeenCalled()
  })

  it('reads no scroll position after a traversal that arrives before the runtime boots, until a frame after boot', async () => {
    listen()
    const scrollYGetter = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0)

    traverseTo('/b', null)
    commitNotifier.notifyCommitted()
    await nextAnimationFrame()
    await nextAnimationFrame()
    window.dispatchEvent(new Event('scroll'))
    expect(scrollYGetter).not.toHaveBeenCalled()

    resumeScrollReadsAfterBoot()
    await nextAnimationFrame()
    expect(scrollYGetter).toHaveBeenCalled()
  })

  it('keeps the stored position of an entry the reader passes through before its restore settles', async () => {
    await listenAndSettleStartup()
    const entryAState = window.history.state
    Effect.runSync(pushUrl('/b'))
    scrollWindowTo(0, 1500)
    const entryBState = window.history.state
    Effect.runSync(pushUrl('/c'))
    scrollWindowTo(0, 200)

    traverseTo('/b', entryBState)
    traverseTo('/a', entryAState)
    await commitRenderAndSettle()
    traverseTo('/b', entryBState)

    expect(Array.last(urlChanges)).toEqual(
      Option.some([
        '/b',
        UrlChangeType.Traverse({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 1500 }),
        }),
      ]),
    )
  })

  it('records the position pushUrl leaves for the new entry when it runs before a restore settles', async () => {
    await listenAndSettleStartup()
    Effect.runSync(pushUrl('/b'))
    scrollWindowTo(0, 1500)
    const entryBState = window.history.state
    Effect.runSync(pushUrl('/c'))
    scrollWindowTo(0, 200)

    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(1500)
    traverseTo('/b', entryBState)
    Effect.runSync(pushUrl('/d'))
    const entryDState = window.history.state
    traverseTo('/b', entryBState)
    await commitRenderAndSettle()
    traverseTo('/d', entryDState)

    expect(Array.last(urlChanges)).toEqual(
      Option.some([
        '/d',
        UrlChangeType.Traverse({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 1500 }),
        }),
      ]),
    )
  })

  it('gives an entry another script pushed its own key when replaceUrl replaces it', async () => {
    window.history.pushState(null, '', '/a')
    await listenAndSettleStartup()
    scrollWindowTo(0, 1000)
    const entryAKey = entryKeyInHistoryState()

    window.history.pushState(null, '', '/a#modal')
    Effect.runSync(replaceUrl('/a?tab=details#modal'))
    const modalEntryKey = entryKeyInHistoryState()
    scrollWindowTo(0, 3000)
    window.history.back()
    await commitRenderAndSettle()
    scrollWindowTo(0, 1000)
    window.history.forward()

    expect(modalEntryKey).toEqual(expect.any(String))
    expect(modalEntryKey).not.toBe(entryAKey)
    expect(urlChanges).toEqual([
      ['/a', UrlChangeType.Replace()],
      [
        '/a',
        UrlChangeType.Traverse({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 1000 }),
        }),
      ],
      [
        '/a',
        UrlChangeType.Traverse({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 3000 }),
        }),
      ],
    ])
  })

  it('records the position of an entry another script pushed under its own key when pushUrl leaves it', async () => {
    window.history.pushState(null, '', '/a')
    await listenAndSettleStartup()
    scrollWindowTo(0, 1000)

    window.history.pushState(null, '', '/a#modal')
    scrollWindowTo(0, 3000)
    Effect.runSync(pushUrl('/b'))
    scrollWindowTo(0, 0)
    window.history.back()
    await commitRenderAndSettle()
    scrollWindowTo(0, 3000)
    window.history.back()

    expect(urlChanges).toEqual([
      ['/b', UrlChangeType.Push()],
      [
        '/a',
        UrlChangeType.Traverse({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 3000 }),
        }),
      ],
      [
        '/a',
        UrlChangeType.Traverse({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 1000 }),
        }),
      ],
    ])
  })

  it('keeps the position of the entry before one another script pushed, when the reader goes Back from it', async () => {
    window.history.pushState(null, '', '/a')
    await listenAndSettleStartup()
    scrollWindowTo(0, 1000)

    window.history.pushState(null, '', '/a#modal')
    scrollWindowTo(0, 3000)
    window.history.back()

    expect(urlChanges).toEqual([
      [
        '/a',
        UrlChangeType.Traverse({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 1000 }),
        }),
      ],
    ])
  })

  it('keeps the stored position of an entry another script left before its restore settled', async () => {
    window.history.pushState(null, '', '/a')
    await listenAndSettleStartup()
    scrollWindowTo(0, 1000)
    const entryAState = window.history.state
    Effect.runSync(pushUrl('/b'))
    await commitRenderAndSettle()
    scrollWindowTo(0, 2500)

    traverseTo('/a', entryAState)
    window.history.pushState(null, '', '/a#modal')
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(2000)
    await commitRenderAndSettle()
    scrollWindowTo(0, 3000)
    window.history.back()

    expect(Array.last(urlChanges)).toEqual(
      Option.some([
        '/a',
        UrlChangeType.Traverse({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 1000 }),
        }),
      ]),
    )
  })

  it('stops waiting for the render commit when the listeners are removed', () => {
    const unsubscribeFromCommit = vi.fn<() => void>()
    const navigationEventListeners = addNavigationEventListeners(
      () => undefined,
      { onUrlRequest: () => undefined, onUrlChange: () => undefined },
      {
        isCommitPending: () => true,
        onNextCommit: () => unsubscribeFromCommit,
      },
    )
    removeListeners = navigationEventListeners.removeListeners

    navigationEventListeners.resumeScrollReadsAfterBoot()
    expect(unsubscribeFromCommit).not.toHaveBeenCalled()

    removeListeners()
    removeListeners = () => {}

    expect(unsubscribeFromCommit).toHaveBeenCalledOnce()
  })

  it('stops waiting for the commit of an earlier traversal when a later one waits for its own', () => {
    const unsubscribesFromCommit: Array<Mock<() => void>> = []
    const navigationEventListeners = addNavigationEventListeners(
      () => undefined,
      { onUrlRequest: () => undefined, onUrlChange: () => undefined },
      {
        isCommitPending: () => true,
        onNextCommit: () => {
          const unsubscribeFromCommit = vi.fn<() => void>()
          unsubscribesFromCommit.push(unsubscribeFromCommit)
          return unsubscribeFromCommit
        },
      },
    )
    removeListeners = navigationEventListeners.removeListeners
    navigationEventListeners.resumeScrollReadsAfterBoot()

    traverseTo('/b', null)
    traverseTo('/a', null)

    expect(
      Array.map(
        unsubscribesFromCommit,
        unsubscribe => unsubscribe.mock.calls.length,
      ),
    ).toEqual([1, 1, 0])
  })

  it('cancels the frame it waits for when the listeners are removed', () => {
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame')
    listen()

    resumeScrollReadsAfterBoot()
    const maybeFrameRequest = Option.map(
      Array.last(requestAnimationFrameSpy.mock.results),
      ({ value }) => value,
    )
    removeListeners()
    removeListeners = () => {}

    expect(Option.isSome(maybeFrameRequest)).toBe(true)
    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(
      Option.getOrThrow(maybeFrameRequest),
    )
  })

  it('reports Push for a foldkit:urlchange event that carries no UrlChangeType', () => {
    listen()

    window.history.pushState(null, '', '/d')
    window.dispatchEvent(new CustomEvent('foldkit:urlchange'))

    expect(urlChanges).toEqual([['/d', UrlChangeType.Push()]])
  })

  it('reports Push for a foldkit:urlchange event whose detail is not a UrlChangeType', () => {
    listen()

    window.history.pushState(null, '', '/d')
    window.dispatchEvent(
      new CustomEvent('foldkit:urlchange', { detail: 'Replace' }),
    )
    window.dispatchEvent(
      new CustomEvent('foldkit:urlchange', { detail: { _tag: 'Traverse' } }),
    )

    expect(urlChanges).toEqual([
      ['/d', UrlChangeType.Push()],
      ['/d', UrlChangeType.Push()],
    ])
  })

  it('still reports traversals when sessionStorage throws', async () => {
    const storageError = new Error('storage is blocked')
    const getItem = vi.fn<Storage['getItem']>(() => {
      throw storageError
    })
    const setItem = vi.fn<Storage['setItem']>(() => {
      throw storageError
    })
    replaceSessionStorage({ getItem, setItem })
    vi.resetModules()
    const freshBrowserListeners = await import('./browserListeners.js')
    const freshNavigation = await import('../navigation/index.js')
    removeListeners = freshBrowserListeners.addNavigationEventListeners(
      () => undefined,
      {
        onUrlRequest: () => undefined,
        onUrlChange: (url, urlChangeType) => {
          urlChanges.push([url.pathname, urlChangeType])
          return undefined
        },
      },
      createCommitNotifier().service,
    ).removeListeners
    scrollWindowTo(0, 500)
    const entryAState = window.history.state

    Effect.runSync(freshNavigation.pushUrl('/b'))
    expect(() => window.dispatchEvent(new Event('pagehide'))).not.toThrow()
    traverseTo('/a', entryAState)

    expect(getItem).toHaveBeenCalled()
    expect(setItem).toHaveBeenCalled()
    expect(urlChanges).toEqual([
      ['/b', freshNavigation.UrlChangeType.Push()],
      [
        '/a',
        freshNavigation.UrlChangeType.Traverse({
          maybeSavedScrollPosition: Option.some({ x: 0, y: 500 }),
        }),
      ],
    ])
  })

  it('never scrolls the window or writes history.scrollRestoration', async () => {
    const scrollRestorationSetter = vi.spyOn(
      window.history,
      'scrollRestoration',
      'set',
    )
    const scroll = vi.spyOn(window, 'scroll')
    const scrollBy = vi.spyOn(window, 'scrollBy')
    const scrollTo = vi.spyOn(window, 'scrollTo')
    await listenAndSettleStartup()
    const entryAState = window.history.state

    Effect.runSync(pushUrl('/b'))
    Effect.runSync(replaceUrl('/c'))
    traverseTo('/a', entryAState)
    await commitRenderAndSettle()
    window.dispatchEvent(new Event('pagehide'))
    removeListeners()
    removeListeners = () => {}

    expect(scrollRestorationSetter).not.toHaveBeenCalled()
    expect(scroll).not.toHaveBeenCalled()
    expect(scrollBy).not.toHaveBeenCalled()
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
