import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

/** The element whose viewport and scrolling VirtualList observes.
 *
 * `Self` keeps the list's own scroll container. `Ancestor` resolves the
 * selector with `closest` from the list's parent. `Window` uses page scrolling.
 * External containers retain their caller-owned layout and overflow styles.
 */
export const ScrollContainer = defineTaggedUnion({
  Self: {},
  Ancestor: { selector: Schema.String },
  Window: {},
})

/** A VirtualList scroll-container selection. */
export type ScrollContainer = typeof ScrollContainer.Type

/** Resolved external owner and its virtual content surface. @internal */
export type ExternalViewport = Readonly<{
  surface: HTMLElement
  owner: HTMLElement | Window
}>

const externalViewports = new WeakMap<HTMLElement, ExternalViewport>()

/** Reads the external owner registered by the live Mount. @internal */
export const externalViewport = (element: HTMLElement) =>
  externalViewports.get(element)

/** Resolves an external owner without changing its layout. @internal */
export const resolveExternalViewport = (
  surface: HTMLElement,
  config: ScrollContainer,
): ExternalViewport | undefined =>
  ScrollContainer.match(config, {
    Self: () => undefined,
    Ancestor: ({ selector }) => {
      const owner = surface.parentElement?.closest(selector)
      if (!(owner instanceof HTMLElement)) {
        throw new Error(
          `VirtualList could not find an ancestor matching ${JSON.stringify(selector)}.`,
        )
      }

      return { surface, owner }
    },
    Window: () => ({ surface, owner: window }),
  })

/** Registers a mounted surface and returns its cleanup. @internal */
export const registerExternalViewport = (viewport: ExternalViewport) => {
  externalViewports.set(viewport.surface, viewport)

  return () => {
    if (externalViewports.get(viewport.surface) === viewport) {
      externalViewports.delete(viewport.surface)
    }
  }
}

/** Reads the viewport content edge in client coordinates. @internal */
export const viewportTop = (element: HTMLElement): number => {
  const viewport = externalViewport(element)
  if (viewport?.owner === window) {
    return 0
  }

  const owner = viewport?.owner
  if (owner instanceof HTMLElement) {
    return owner.getBoundingClientRect().top + owner.clientTop
  }

  return element.getBoundingClientRect().top + element.clientTop
}

/** Reads the active scroll viewport height. @internal */
export const viewportHeight = (element: HTMLElement): number => {
  const viewport = externalViewport(element)
  if (viewport?.owner === window) {
    return document.documentElement.clientHeight
  }

  return viewport?.owner instanceof HTMLElement
    ? viewport.owner.clientHeight
    : element.clientHeight
}

/** Reads the signed viewport offset from the list content origin. @internal */
export const externalScrollTop = (element: HTMLElement): number =>
  viewportTop(element) - element.getBoundingClientRect().top - element.clientTop

/** Reads the list content extent independently of its scroll owner. @internal */
export const contentHeight = (element: HTMLElement): number =>
  externalViewport(element) === undefined
    ? element.scrollHeight
    : Math.max(element.scrollHeight, element.clientHeight)

/** Reads the external owner scroll offset. @internal */
export const ownerScrollTop = (viewport: ExternalViewport): number =>
  viewport.owner instanceof HTMLElement
    ? viewport.owner.scrollTop
    : viewport.owner.scrollY

/** Converts a logical list offset to an owner scroll offset. @internal */
export const ownerScrollTarget = (
  viewport: ExternalViewport,
  logicalTop: number,
): number =>
  ownerScrollTop(viewport) + logicalTop - externalScrollTop(viewport.surface)

/** Writes a logical list offset to its external owner. @internal */
export const scrollExternalViewport = (
  viewport: ExternalViewport,
  logicalTop: number,
): void => {
  const top = ownerScrollTarget(viewport, logicalTop)
  viewport.owner.scrollTo({ top, behavior: 'instant' })
}

/** Reports whether any list content intersects its viewport. @internal */
export const intersectsViewport = (element: HTMLElement): boolean => {
  const top = viewportTop(element)
  const rect = element.getBoundingClientRect()
  return rect.bottom > top && rect.top < top + viewportHeight(element)
}

/** Observes layout changes preceding an externally scrolled list. @internal */
export const observeExternalPosition = (
  viewport: ExternalViewport,
  changed: () => void,
): (() => void) => {
  let frame: number | undefined
  let isDisposed = false
  const schedule = () => {
    if (frame !== undefined || isDisposed) {
      return
    }

    frame = requestAnimationFrame(() => {
      frame = undefined
      if (!isDisposed) {
        changed()
      }
    })
  }

  const resizeObserver = new ResizeObserver(schedule)
  const observed = new Set<Element>()
  const observe = (element: Element, current: Set<Element>) => {
    current.add(element)
    if (!observed.has(element)) {
      observed.add(element)
      resizeObserver.observe(element)
    }
  }

  const reconcile = () => {
    const current = new Set<Element>()
    let descendant: Element = viewport.surface
    while (descendant.parentElement !== null) {
      const parent = descendant.parentElement
      observe(parent, current)
      for (const sibling of parent.children) {
        if (sibling === descendant) {
          break
        }

        observe(sibling, current)
      }

      if (parent === viewport.owner) {
        break
      }

      descendant = parent
    }

    for (const element of observed) {
      if (!current.has(element)) {
        resizeObserver.unobserve(element)
        observed.delete(element)
      }
    }
  }

  const root =
    viewport.owner instanceof HTMLElement
      ? viewport.owner
      : document.documentElement
  const mutationObserver = new MutationObserver(() => {
    reconcile()
    schedule()
  })
  mutationObserver.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'open'],
    characterData: true,
  })
  reconcile()
  window.addEventListener('resize', schedule, { passive: true })

  return () => {
    isDisposed = true
    if (frame !== undefined) {
      cancelAnimationFrame(frame)
    }

    mutationObserver.disconnect()
    resizeObserver.disconnect()
    window.removeEventListener('resize', schedule)
  }
}
