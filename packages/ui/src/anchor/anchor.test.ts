/// <reference types="node" />

import {
  type MockInstance,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  type SetupConfig,
  anchorSetup,
  portalToContainingRoot,
} from './index.js'

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

describe('anchorSetup non-finite positioning input', () => {
  const POSITIONING_FAILURE =
    '[@foldkit/ui] anchorSetup could not position the panel. It keeps the visibility its caller rendered until positioning succeeds.'

  const unhandledRejections: Array<unknown> = []
  const anchorCleanups: Array<() => void> = []

  const recordUnhandledRejection = (reason: unknown): void => {
    unhandledRejections.push(reason)
  }

  beforeEach(() => {
    process.on('unhandledRejection', recordUnhandledRejection)
  })

  afterEach(() => {
    for (const cleanup of anchorCleanups.splice(0)) {
      cleanup()
    }

    process.off('unhandledRejection', recordUnhandledRejection)
    unhandledRejections.length = 0
    vi.restoreAllMocks()
    document.body.replaceChildren()
  })

  const mountHiddenPanel = (
    config: Omit<SetupConfig, 'buttonId'>,
  ): HTMLElement => {
    const button = document.createElement('button')
    button.id = 'trigger'
    const panel = document.createElement('div')
    panel.style.visibility = 'hidden'
    const arrowElement = document.createElement('div')
    arrowElement.id = 'arrow'
    panel.append(arrowElement)
    document.body.append(button, panel)

    anchorCleanups.push(anchorSetup(panel, { buttonId: 'trigger', ...config }))

    return panel
  }

  const waitForMacrotask = (): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, 0))

  const expectPositioningFailureReportedOnce = async (
    reportError: MockInstance<typeof console.error>,
    panel: HTMLElement,
  ): Promise<void> => {
    await vi.waitFor(() => {
      expect(reportError).toHaveBeenCalled()
    })

    window.dispatchEvent(new Event('resize'))
    await waitForMacrotask()

    expect(reportError).toHaveBeenCalledTimes(1)
    expect(reportError).toHaveBeenCalledWith(
      POSITIONING_FAILURE,
      new Error(
        '[foldkit] Css.px received NaN. CSS numeric values must be finite.',
      ),
    )
    expect(panel.style.visibility).toBe('hidden')
    expect(unhandledRejections).toEqual([])
  }

  it('reports an arrow offset that is not finite and keeps the panel hidden', async () => {
    const reportError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const panel = mountHiddenPanel({
      anchor: { portal: false },
      arrowId: 'arrow',
      arrowPadding: Number.NaN,
    })

    await expectPositioningFailureReportedOnce(reportError, panel)
    expect(panel.style.left).toBe('0px')
    expect(panel.style.top).toBe('0px')
    expect(panel.style.getPropertyValue('--arrow-x')).toBe('')
  })

  it('reports an available height that is not finite and keeps the panel hidden', async () => {
    const reportError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const panel = mountHiddenPanel({
      anchor: { portal: false, padding: Number.NaN },
    })

    await expectPositioningFailureReportedOnce(reportError, panel)
    expect(panel.style.getPropertyValue('--button-width')).toBe('0px')
    expect(panel.style.maxHeight).toBe('')
  })
})
