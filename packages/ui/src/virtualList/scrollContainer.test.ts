import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ScrollContainer,
  contentHeight,
  externalScrollTop,
  externalViewport,
  intersectsViewport,
  observeExternalPosition,
  ownerScrollTarget,
  registerExternalViewport,
  resolveExternalViewport,
  scrollExternalViewport,
  viewportHeight,
  viewportTop,
} from './scrollContainer.js'
import { Message, ObservedAnchor, init, update } from './virtualList.js'

const rect = (top: number, height: number) => ({
  top,
  bottom: top + height,
  height,
  left: 0,
  right: 400,
  width: 400,
  x: 0,
  y: top,
  toJSON: () => ({}),
})

const makeAncestor = () => {
  const owner = document.createElement('main')
  const surface = document.createElement('ul')
  owner.id = 'catalog-main'
  owner.append(surface)
  document.body.append(owner)
  Object.defineProperties(owner, {
    clientHeight: { value: 500 },
    clientTop: { value: 2 },
    getBoundingClientRect: { value: () => rect(60, 504) },
  })
  Object.defineProperty(surface, 'clientHeight', { value: 4_800 })
  Object.defineProperty(surface, 'getBoundingClientRect', {
    value: () => rect(262, 4_800),
    configurable: true,
  })
  owner.scrollTop = 100

  const viewport = resolveExternalViewport(
    surface,
    ScrollContainer.Ancestor({ selector: '#catalog-main' }),
  )
  if (viewport === undefined) {
    throw new Error('Expected an ancestor viewport')
  }

  return { owner, surface, viewport }
}

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('VirtualList external scroll coordinates', () => {
  it('keeps the signed offset when preceding content fills part of the viewport', () => {
    const { owner, surface, viewport } = makeAncestor()
    const unregister = registerExternalViewport(viewport)

    expect(viewportTop(surface)).toBe(62)
    expect(viewportHeight(surface)).toBe(500)
    expect(externalScrollTop(surface)).toBe(-200)
    expect(contentHeight(surface)).toBe(4_800)
    expect(ownerScrollTarget(viewport, 960)).toBe(1_260)
    expect(intersectsViewport(surface)).toBe(true)
    expect(owner.style.overflow).toBe('')

    unregister()
    expect(externalViewport(surface)).toBeUndefined()
  })

  it('targets the list end independently of content after it', () => {
    const { owner, surface, viewport } = makeAncestor()
    registerExternalViewport(viewport)
    const scrollTo = vi.fn()
    owner.scrollTo = scrollTo

    scrollExternalViewport(
      viewport,
      contentHeight(surface) - viewportHeight(surface),
    )

    expect(scrollTo).toHaveBeenCalledWith({ top: 4_600, behavior: 'instant' })
  })

  it('does not report an offscreen list as visible', () => {
    const { surface, viewport } = makeAncestor()
    registerExternalViewport(viewport)
    Object.defineProperty(surface, 'getBoundingClientRect', {
      value: () => rect(700, 4_800),
    })

    expect(intersectsViewport(surface)).toBe(false)
    expect(externalScrollTop(surface)).toBe(-638)
  })

  it('uses window scrolling without changing page layout', () => {
    const surface = document.createElement('ul')
    document.body.append(surface)
    Object.defineProperty(surface, 'getBoundingClientRect', {
      value: () => rect(300, 4_800),
    })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: 600,
      configurable: true,
    })
    const viewport = resolveExternalViewport(surface, ScrollContainer.Window())
    if (viewport === undefined) {
      throw new Error('Expected a window viewport')
    }
    registerExternalViewport(viewport)

    expect(viewportTop(surface)).toBe(0)
    expect(viewportHeight(surface)).toBe(600)
    expect(externalScrollTop(surface)).toBe(-300)
    expect(ownerScrollTarget(viewport, 900)).toBe(window.scrollY + 1_200)
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('requires the selector to resolve an ancestor rather than an unrelated element', () => {
    const { surface } = makeAncestor()
    expect(() =>
      resolveExternalViewport(
        surface,
        ScrollContainer.Ancestor({ selector: '#missing' }),
      ),
    ).toThrow('could not find an ancestor')
    expect(
      resolveExternalViewport(surface, ScrollContainer.Self()),
    ).toBeUndefined()
  })

  it('owns position observers and cancels queued measurements on disposal', () => {
    const { viewport } = makeAncestor()
    const observe = vi.fn()
    const disconnect = vi.fn()
    const unobserve = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe
        unobserve = unobserve
        disconnect = disconnect
      },
    )
    const request = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockReturnValue(42)
    const cancel = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined)
    const changed = vi.fn()
    const dispose = observeExternalPosition(viewport, changed)

    window.dispatchEvent(new Event('resize'))
    expect(request).toHaveBeenCalledOnce()
    dispose()
    window.dispatchEvent(new Event('resize'))

    expect(disconnect).toHaveBeenCalledOnce()
    expect(cancel).toHaveBeenCalledWith(42)
    expect(changed).not.toHaveBeenCalled()
    expect(request).toHaveBeenCalledOnce()
    expect(observe).toHaveBeenCalled()
  })
})

describe('VirtualList viewport resizing', () => {
  it('preserves the pre-resize row anchor when an absolute preceding row overlaps it', () => {
    const unmeasured = init({
      id: 'resizing-list',
      rowHeightPx: 40,
      scrollContainer: ScrollContainer.Ancestor({ selector: '#catalog-main' }),
    }).model
    const measured = update(
      unmeasured,
      Message.ResizedContainer({
        containerWidth: 800,
        containerHeight: 420,
        viewport: {
          scrollTop: 4_860,
          scrollHeight: 20_000,
          containerHeight: 420,
          anchor: ObservedAnchor.Row({
            key: '120',
            index: 120,
            viewportOffset: 0,
          }),
        },
      }),
    )
    const resized = update(
      measured.model,
      Message.ResizedContainer({
        containerWidth: 360,
        containerHeight: 340,
        viewport: {
          scrollTop: 4_860,
          scrollHeight: 20_000,
          containerHeight: 340,
          anchor: ObservedAnchor.Row({
            key: '119',
            index: 119,
            viewportOffset: -100,
          }),
        },
      }),
    )

    expect(resized.model.viewportAnchor).toEqual(measured.model.viewportAnchor)
    expect(resized.model.layoutVersion).toBe(measured.model.layoutVersion + 1)
    expect(resized.model.measuredRowHeights).toEqual({})
  })
})
