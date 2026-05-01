import {
  autoUpdate,
  computePosition,
  flip,
  offset as floatingOffset,
  shift,
  size,
} from '@floating-ui/dom'
import type { Placement } from '@floating-ui/dom'

/** Static configuration for anchor-based positioning of a floating element relative to a button. */
export type AnchorConfig = Readonly<{
  placement?: Placement
  gap?: number
  offset?: number
  padding?: number
  portal?: boolean
}>

const PORTAL_ROOT_ID = 'foldkit-portal-root'

const getOrCreatePortalRoot = (): HTMLElement => {
  const existing = document.getElementById(PORTAL_ROOT_ID)

  if (existing) {
    return existing
  }

  const root = document.createElement('div')
  root.id = PORTAL_ROOT_ID

  return document.body.appendChild(root)
}

/** Positions a floating element relative to its button using Floating UI, then
 *  returns a cleanup function. Designed to be called inside an `OnMount`
 *  action: the consumer wraps the call in `Effect.sync` and stashes the
 *  returned cleanup in the `Mount` result. When `interceptTab` is true
 *  (default), Tab key in portal mode refocuses the button — set to false for
 *  components like Popover where Tab should navigate naturally within the
 *  panel. When `focusAfterPosition` is true, the element is focused after the
 *  first position computation clears visibility — deferred via
 *  requestAnimationFrame so the element is painted before focus fires.
 *  `focusSelector` optionally targets a descendant (e.g. a calendar grid
 *  inside a popover panel) instead of the panel itself. */
export const anchorSetup =
  (config: {
    buttonId: string
    anchor: AnchorConfig
    interceptTab?: boolean
    focusAfterPosition?: boolean
    focusSelector?: string
  }) =>
  (items: Element): (() => void) => {
    const button = document.getElementById(config.buttonId)

    if (!(button instanceof HTMLElement) || !(items instanceof HTMLElement)) {
      return () => {}
    }

    const isPortal = config.anchor.portal ?? true

    if (isPortal) {
      getOrCreatePortalRoot().appendChild(items)
    }

    const { placement, gap, offset: crossAxis, padding } = config.anchor
    const shouldInterceptTab = config.interceptTab ?? true

    let isFirstUpdate = true

    const floatingCleanup = autoUpdate(button, items, () => {
      computePosition(button, items, {
        placement: placement ?? 'bottom-start',
        strategy: 'absolute',
        middleware: [
          floatingOffset({
            mainAxis: gap ?? 0,
            crossAxis: crossAxis ?? 0,
          }),
          flip({ padding: padding ?? 0 }),
          shift({ padding: padding ?? 0 }),
          size({
            padding: padding ?? 0,
            apply({ rects, availableHeight }) {
              items.style.setProperty(
                '--button-width',
                `${rects.reference.width}px`,
              )
              items.style.maxHeight = `${availableHeight}px`
              items.style.overflowY = 'auto'
              items.style.overscrollBehavior = 'none'
            },
          }),
        ],
      }).then(({ x, y }) => {
        items.style.left = `${x}px`
        items.style.top = `${y}px`

        if (isFirstUpdate) {
          isFirstUpdate = false
          items.style.visibility = ''

          if (config.focusAfterPosition ?? false) {
            requestAnimationFrame(() => {
              const target = config.focusSelector
                ? document.querySelector(config.focusSelector)
                : items
              if (target instanceof HTMLElement) {
                target.focus()
              }
            })
          }
        }
      })
    })

    const portalCleanup = isPortal
      ? () => {
          try {
            items.remove()
          } catch {
            // NOTE: a blur-triggered re-render may unmount the items element
            // before this cleanup runs, so the remove() call can throw on a
            // node that's already been removed. Swallow the error.
          }
        }
      : undefined

    if (isPortal && shouldInterceptTab) {
      const handleTabKey = (event: Event): void => {
        if (event instanceof KeyboardEvent && event.key === 'Tab') {
          button.focus()
        }
      }

      items.addEventListener('keydown', handleTabKey)

      return () => {
        floatingCleanup()
        items.removeEventListener('keydown', handleTabKey)
        portalCleanup?.()
      }
    } else {
      return () => {
        floatingCleanup()
        portalCleanup?.()
      }
    }
  }
