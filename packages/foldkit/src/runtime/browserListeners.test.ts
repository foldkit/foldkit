import { afterEach, beforeAll, beforeEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { type UrlRequest } from '../navigation/urlRequest.js'
import { type Url } from '../url/index.js'
import { type RoutingConfig, addLinkClickListener } from './browserListeners.js'

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
): MouseEvent => clickElement(link, options)

const clickElement = (
  element: Element,
  options: MouseEventInit = {},
): MouseEvent => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...options,
  })
  element.dispatchEvent(event)
  return event
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

const makeSvgAnchor = (
  configure: (link: SVGAElement) => void,
): SVGRectElement => {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg')
  const link = document.createElementNS(SVG_NAMESPACE, 'a')
  configure(link)
  const rect = document.createElementNS(SVG_NAMESPACE, 'rect')
  link.appendChild(rect)
  svg.appendChild(link)
  document.body.appendChild(svg)
  return rect
}

const makeSvgLink = (
  href: string,
  attributes: Readonly<{ target?: string }> = {},
): SVGRectElement =>
  makeSvgAnchor(link => {
    link.setAttribute('href', href)
    if (attributes.target !== undefined) {
      link.setAttribute('target', attributes.target)
    }
  })

const makeSvgXLink = (href: string): SVGRectElement =>
  makeSvgAnchor(link => {
    link.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', href)
  })

const makeSvgLinkWithBothHrefs = (
  href: string,
  xlinkHref: string,
): SVGRectElement =>
  makeSvgAnchor(link => {
    link.setAttribute('href', href)
    link.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', xlinkHref)
  })

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

  it('preventDefaults and dispatches Internal for a click inside an SVG anchor', () => {
    const rect = makeSvgLink('/units/42')
    const event = clickElement(rect)

    expect(event.defaultPrevented).toBe(true)
    expect(dispatched).toMatchObject([
      { _tag: 'Internal', url: { pathname: '/units/42' } },
    ])
  })

  it('falls through on an SVG anchor with target="_blank"', () => {
    const rect = makeSvgLink('/units/42', { target: '_blank' })
    const event = clickElement(rect)

    expect(event.defaultPrevented).toBe(false)
    expect(dispatched).toHaveLength(0)
  })

  it('preventDefaults and dispatches Internal for an SVG anchor written with xlink:href', () => {
    const rect = makeSvgXLink('/units/43')
    const event = clickElement(rect)

    expect(event.defaultPrevented).toBe(true)
    expect(dispatched).toMatchObject([
      { _tag: 'Internal', url: { pathname: '/units/43' } },
    ])
  })

  it('prefers href over xlink:href when an SVG anchor has both', () => {
    const rect = makeSvgLinkWithBothHrefs('/units/42', '/units/43')
    const event = clickElement(rect)

    expect(event.defaultPrevented).toBe(true)
    expect(dispatched).toMatchObject([
      { _tag: 'Internal', url: { pathname: '/units/42' } },
    ])
  })

  it('dispatches the resolved URL for a protocol-relative SVG link', () => {
    const rect = makeSvgLink('//other.example/x')
    const event = clickElement(rect)

    expect(event.defaultPrevented).toBe(true)
    expect(dispatched).toMatchObject([
      {
        _tag: 'External',
        href: new URL('//other.example/x', document.baseURI).href,
      },
    ])
  })
})
