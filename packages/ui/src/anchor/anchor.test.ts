import { afterEach, describe, expect, it, vi } from 'vitest'

import { anchorSetup, portalBackdrop, portalToContainingRoot } from './index.js'

const PORTAL_ROOT_ID = 'foldkit-portal-root'
const DIALOG_PORTAL_ROOT_ATTRIBUTE = 'data-foldkit-portal-root'

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

  it('portals an element inside a dialog into a portal root appended to that dialog', () => {
    const dialog = document.createElement('dialog')
    const panel = document.createElement('div')
    const element = document.createElement('div')
    panel.appendChild(element)
    dialog.appendChild(panel)
    document.body.appendChild(dialog)

    portalToContainingRoot(element)

    const dialogPortalRoot = element.parentElement
    expect(dialogPortalRoot?.hasAttribute(DIALOG_PORTAL_ROOT_ATTRIBUTE)).toBe(
      true,
    )
    expect(dialogPortalRoot?.parentElement).toBe(dialog)
    expect(dialog.lastElementChild).toBe(dialogPortalRoot)
    expect(document.getElementById(PORTAL_ROOT_ID)).toBeNull()
  })

  it('reuses one portal root per dialog without sharing it between dialogs', () => {
    const firstDialog = document.createElement('dialog')
    const secondDialog = document.createElement('dialog')
    const first = document.createElement('div')
    const second = document.createElement('div')
    const third = document.createElement('div')
    firstDialog.append(first, second)
    secondDialog.append(third)
    document.body.append(firstDialog, secondDialog)

    portalToContainingRoot(first)
    portalToContainingRoot(second)
    portalToContainingRoot(third)

    expect(
      firstDialog.querySelectorAll(`[${DIALOG_PORTAL_ROOT_ATTRIBUTE}]`),
    ).toHaveLength(1)
    expect(second.parentElement).toBe(first.parentElement)
    expect(third.parentElement?.parentElement).toBe(secondDialog)
  })

  it('portals an element inside a nested dialog into the innermost dialog', () => {
    const outerDialog = document.createElement('dialog')
    const innerDialog = document.createElement('dialog')
    const element = document.createElement('div')
    innerDialog.appendChild(element)
    outerDialog.appendChild(innerDialog)
    document.body.appendChild(outerDialog)

    portalToContainingRoot(element)

    expect(element.parentElement?.parentElement).toBe(innerDialog)
  })

  it('removes an emptied dialog portal root so a reopened dialog appends a fresh one after its content', () => {
    const dialog = document.createElement('dialog')
    const firstPanel = document.createElement('div')
    const firstElement = document.createElement('div')
    firstPanel.appendChild(firstElement)
    dialog.appendChild(firstPanel)
    document.body.appendChild(dialog)

    const cleanup = portalToContainingRoot(firstElement)
    cleanup()
    firstPanel.remove()

    expect(dialog.querySelector(`[${DIALOG_PORTAL_ROOT_ATTRIBUTE}]`)).toBeNull()

    const secondPanel = document.createElement('div')
    const secondElement = document.createElement('div')
    secondPanel.appendChild(secondElement)
    dialog.appendChild(secondPanel)

    portalToContainingRoot(secondElement)

    expect(dialog.lastElementChild).toBe(secondElement.parentElement)
    expect(dialog.firstElementChild).toBe(secondPanel)
  })

  it('keeps a dialog portal root while another element is still portaled into it', () => {
    const dialog = document.createElement('dialog')
    const first = document.createElement('div')
    const second = document.createElement('div')
    dialog.append(first, second)
    document.body.appendChild(dialog)

    const cleanupFirst = portalToContainingRoot(first)
    portalToContainingRoot(second)
    const dialogPortalRoot = second.parentElement
    cleanupFirst()

    expect(dialogPortalRoot?.parentElement).toBe(dialog)
    expect(second.parentElement).toBe(dialogPortalRoot)
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

describe('portalBackdrop', () => {
  afterEach(() => {
    document.getElementById(PORTAL_ROOT_ID)?.remove()
    document.body.replaceChildren()
  })

  it('portals a backdrop outside a dialog into the portal root in document.body', () => {
    const wrapper = document.createElement('div')
    const backdrop = document.createElement('div')
    wrapper.appendChild(backdrop)
    document.body.appendChild(wrapper)

    portalBackdrop(backdrop)

    expect(backdrop.parentElement).toBe(document.getElementById(PORTAL_ROOT_ID))
  })

  it('moves a backdrop inside a dialog to directly before its wrapper', () => {
    const dialog = document.createElement('dialog')
    const panel = document.createElement('div')
    const wrapper = document.createElement('div')
    const trigger = document.createElement('button')
    const backdrop = document.createElement('div')
    wrapper.append(trigger, backdrop)
    panel.appendChild(wrapper)
    dialog.appendChild(panel)
    document.body.appendChild(dialog)

    portalBackdrop(backdrop)

    expect(backdrop.parentElement).toBe(panel)
    expect(backdrop.nextElementSibling).toBe(wrapper)
    expect(dialog.querySelector(`[${DIALOG_PORTAL_ROOT_ATTRIBUTE}]`)).toBeNull()
    expect(document.getElementById(PORTAL_ROOT_ID)).toBeNull()
  })

  it('portals a backdrop rendered directly in a dialog into the dialog portal root', () => {
    const dialog = document.createElement('dialog')
    const backdrop = document.createElement('div')
    dialog.appendChild(backdrop)
    document.body.appendChild(dialog)

    portalBackdrop(backdrop)

    expect(backdrop.parentElement?.parentElement).toBe(dialog)
    expect(
      backdrop.parentElement?.hasAttribute(DIALOG_PORTAL_ROOT_ATTRIBUTE),
    ).toBe(true)
  })

  it('cleanup removes a backdrop moved inside a dialog', () => {
    const dialog = document.createElement('dialog')
    const wrapper = document.createElement('div')
    const backdrop = document.createElement('div')
    wrapper.appendChild(backdrop)
    dialog.appendChild(wrapper)
    document.body.appendChild(dialog)

    const cleanup = portalBackdrop(backdrop)
    cleanup()

    expect(backdrop.isConnected).toBe(false)
    expect(Array.from(dialog.children)).toEqual([wrapper])
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
