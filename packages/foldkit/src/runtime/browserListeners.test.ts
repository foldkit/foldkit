import { afterEach, beforeAll, beforeEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { type UrlRequest } from '../navigation/urlRequest.js'
import { type Url } from '../url/index.js'
import {
  addBfcacheRestoreListener,
  addLinkClickListener,
} from './browserListeners.js'
import { type RoutingConfig } from './runtime.js'

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

describe('addBfcacheRestoreListener', () => {
  const dispatchPageShow = (isRestoredFromBfcache: boolean): void => {
    const event = new Event('pageshow')
    Object.defineProperty(event, 'persisted', {
      value: isRestoredFromBfcache,
      configurable: true,
    })
    window.dispatchEvent(event)
  }

  let reloadSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
  })

  afterEach(() => {
    reloadSpy.mockRestore()
  })

  it('reloads when the page is restored from the back/forward cache', () => {
    const removeListener = addBfcacheRestoreListener()

    dispatchPageShow(true)

    expect(reloadSpy).toHaveBeenCalledTimes(1)
    removeListener()
  })

  it('does not reload on an ordinary (non-bfcache) pageshow', () => {
    const removeListener = addBfcacheRestoreListener()

    dispatchPageShow(false)

    expect(reloadSpy).not.toHaveBeenCalled()
    removeListener()
  })

  // NOTE: A page-owning runtime installs this once and never removes it, so a
  // second install (HMR re-run) must not stack a second reload onto one
  // restore.
  it('registers idempotently across repeated installs', () => {
    const removeFirst = addBfcacheRestoreListener()
    const removeSecond = addBfcacheRestoreListener()

    dispatchPageShow(true)

    expect(reloadSpy).toHaveBeenCalledTimes(1)
    removeFirst()
    removeSecond()
  })

  it('stops reloading once the listener is removed', () => {
    const removeListener = addBfcacheRestoreListener()
    removeListener()

    dispatchPageShow(true)

    expect(reloadSpy).not.toHaveBeenCalled()
  })
})
