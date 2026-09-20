import { afterEach, describe, expect, it, vi } from 'vitest'

import { anchorSetup, portalToContainingRoot } from './index.js'

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

describe('anchorSetup invalid inputs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.replaceChildren()
  })

  it('reports a missing trigger and leaves the panel hidden', () => {
    const reportError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const panel = document.createElement('div')
    panel.style.visibility = 'hidden'
    document.body.appendChild(panel)

    const cleanup = anchorSetup(panel, { buttonId: 'missing', anchor: {} })

    expect(reportError).toHaveBeenCalledTimes(1)
    expect(reportError).toHaveBeenCalledWith(
      '[@foldkit/ui] anchorSetup could not find a trigger with id "missing". The panel will not be positioned.',
    )
    expect(panel.style.visibility).toBe('hidden')
    expect(document.getElementById(PORTAL_ROOT_ID)).toBeNull()
    expect(cleanup).not.toThrow()
  })

  it('reports a non-HTML trigger separately from a missing trigger', () => {
    const reportError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const trigger = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    )
    trigger.id = 'trigger'
    const panel = document.createElement('div')
    document.body.append(trigger, panel)

    const cleanup = anchorSetup(panel, { buttonId: 'trigger', anchor: {} })

    expect(reportError).toHaveBeenCalledTimes(1)
    expect(reportError).toHaveBeenCalledWith(
      '[@foldkit/ui] anchorSetup requires an HTML trigger with id "trigger". The panel will not be positioned.',
    )
    expect(document.getElementById(PORTAL_ROOT_ID)).toBeNull()
    expect(cleanup).not.toThrow()
  })

  it('reports a non-HTML panel separately from a missing trigger', () => {
    const reportError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const panel = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    document.body.appendChild(panel)

    const cleanup = anchorSetup(panel, { buttonId: 'missing', anchor: {} })

    expect(reportError).toHaveBeenCalledTimes(1)
    expect(reportError).toHaveBeenCalledWith(
      '[@foldkit/ui] anchorSetup requires an HTML panel. The panel will not be positioned.',
    )
    expect(document.getElementById(PORTAL_ROOT_ID)).toBeNull()
    expect(cleanup).not.toThrow()
  })
})
