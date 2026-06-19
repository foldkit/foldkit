import { afterEach, describe, expect, it } from 'vitest'

import { portalToContainingRoot } from './anchor.js'

const PORTAL_ROOT_ID = 'foldkit-portal-root'

describe('portalToContainingRoot', () => {
  afterEach(() => {
    document.getElementById(PORTAL_ROOT_ID)?.remove()
    document.body.replaceChildren()
  })

  it('portals a light-DOM element into a portal root in document.body', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)

    portalToContainingRoot(element)

    const portalRoot = document.getElementById(PORTAL_ROOT_ID)
    expect(portalRoot).not.toBeNull()
    expect(portalRoot?.parentNode).toBe(document.body)
    expect(element.parentNode).toBe(portalRoot)
  })

  it('portals a shadow-DOM element into a portal root inside the same shadow root', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const element = document.createElement('div')
    shadow.appendChild(element)

    portalToContainingRoot(element)

    const shadowPortalRoot = shadow.getElementById(PORTAL_ROOT_ID)
    expect(shadowPortalRoot).not.toBeNull()
    expect(element.parentNode).toBe(shadowPortalRoot)
    expect(element.getRootNode()).toBe(shadow)
    // It must stay inside the shadow root, not leak into the document body.
    expect(document.getElementById(PORTAL_ROOT_ID)).toBeNull()
  })

  it('reuses the existing portal root within a root rather than creating a second', () => {
    const first = document.createElement('div')
    const second = document.createElement('div')
    document.body.append(first, second)

    portalToContainingRoot(first)
    portalToContainingRoot(second)

    const portalRoot = document.getElementById(PORTAL_ROOT_ID)
    expect(document.querySelectorAll(`#${PORTAL_ROOT_ID}`)).toHaveLength(1)
    expect(first.parentNode).toBe(portalRoot)
    expect(second.parentNode).toBe(portalRoot)
  })

  it('cleanup removes the portaled element from the portal root', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)

    const cleanup = portalToContainingRoot(element)
    const portalRoot = document.getElementById(PORTAL_ROOT_ID)
    expect(portalRoot?.contains(element)).toBe(true)

    cleanup()
    expect(portalRoot?.contains(element)).toBe(false)
  })
})
