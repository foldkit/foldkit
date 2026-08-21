import { Array, Function, Option, Schema as S, String, pipe } from 'effect'

import {
  type Placement as FloatingPlacement,
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset as floatingOffset,
  shift,
  size,
} from '@floating-ui/dom'

/** Schema mirroring `@floating-ui/dom`'s `Placement` literal union: a side
 *  (`top`/`right`/`bottom`/`left`) optionally suffixed with `-start` or `-end`. */
export const Placement = S.Literals([
  'top',
  'right',
  'bottom',
  'left',
  'top-start',
  'top-end',
  'right-start',
  'right-end',
  'bottom-start',
  'bottom-end',
  'left-start',
  'left-end',
])

export type Placement = typeof Placement.Type

/** Schema mirroring `@floating-ui/dom`'s `Padding` type: a uniform number or a
 *  partial per-side object (`top`/`right`/`bottom`/`left`). */
export const Padding = S.Union([
  S.Number,
  S.Struct({
    top: S.optionalKey(S.Number),
    right: S.optionalKey(S.Number),
    bottom: S.optionalKey(S.Number),
    left: S.optionalKey(S.Number),
  }),
])

export type Padding = typeof Padding.Type

/** Static configuration for anchor-based positioning of a floating element relative to a button. */
export const AnchorConfig = S.Struct({
  placement: S.optional(Placement),
  gap: S.optional(S.Number),
  offset: S.optional(S.Number),
  padding: S.optional(Padding),
  portal: S.optional(S.Boolean),
  isPlacementLocked: S.optional(S.Boolean),
})

export type AnchorConfig = typeof AnchorConfig.Type

const PORTAL_ROOT_ID = 'foldkit-portal-root'

const getOrCreatePortalRoot = (element: Element): HTMLElement => {
  // NOTE: portal into the element's containing root, the shadow root when the
  // app is mounted inside one (e.g. the DevTools overlay) or `document.body`
  // otherwise, so the panel keeps that root's scoped styles while still
  // escaping ancestor clipping. `getRootNode()` must be read here, before the
  // element is relocated out of the mounting tree.
  const root = element.getRootNode()
  const inShadow = root instanceof ShadowRoot
  const owner: Document | ShadowRoot = inShadow ? root : document
  const parent: ParentNode = inShadow ? root : document.body

  const existing = owner.getElementById(PORTAL_ROOT_ID)

  if (existing) {
    return existing
  }

  const portalRoot = document.createElement('div')
  portalRoot.id = PORTAL_ROOT_ID

  // NOTE: prepended (not appended) so portaled overlays sit BEFORE the app's
  // listbox/popover/menu wrappers in tree order. Those wrappers are
  // `position: relative; z-index: auto` and paint at CSS step 8 in tree order;
  // a backdrop appended after them would paint on top of every button,
  // breaking click-outside detection. Prepending makes wrappers paint
  // above the backdrop, while panels (z-10) still win via step 9.
  parent.prepend(portalRoot)
  return portalRoot
}

/** Relocates an element into the shared `foldkit-portal-root` div within its
 *  containing root: the shadow root when mounted inside one, otherwise
 *  `document.body`. Escapes any ancestor stacking context while keeping the
 *  element under that root's scoped styles. Returns a cleanup function that
 *  removes the element from the portal root. Designed to be called from inside
 *  an `OnMount` action: the consumer wraps the call in `Effect.sync` and
 *  stashes the returned cleanup in the `Mount` result. */
export const portalToContainingRoot = (element: Element): (() => void) => {
  getOrCreatePortalRoot(element).appendChild(element)
  return () => {
    try {
      element.remove()
    } catch {
      // NOTE: a re-render may unmount the element before this cleanup fires,
      // so the remove() call can throw on a node that's already been removed.
      // Swallow the error.
    }
  }
}

const toSide = (placement: FloatingPlacement): string =>
  pipe(placement, String.split('-'), Array.headNonEmpty)

/** Config for `anchorSetup`.
 *
 *  - `buttonId`: id of the trigger to position against, resolved through the
 *    element's own root.
 *  - `anchor`: the static positioning options.
 *  - `interceptTab`: returns focus to the trigger on Tab inside a portaled
 *    panel. Defaults to `true`.
 *  - `focusAfterPosition`: focuses the element once the first position
 *    resolves. Defaults to `false`.
 *  - `focusSelector`: focuses this descendant instead of the element itself.
 *    Read only when `focusAfterPosition` is true.
 *  - `arrowId`: id of an arrow element inside the panel, resolved through the
 *    element's own root. When it resolves, the arrow's offset along the panel
 *    edge is published as `--arrow-x` and `--arrow-y`.
 *  - `arrowPadding`: distance in pixels the arrow keeps from the panel's
 *    corners. Defaults to `0`. Separate from `anchor.padding`, which is the
 *    viewport padding. */
export type SetupConfig = Readonly<{
  buttonId: string
  anchor: AnchorConfig
  interceptTab?: boolean
  focusAfterPosition?: boolean
  focusSelector?: string
  arrowId?: string
  arrowPadding?: number
}>

const setOrRemoveLength = (
  element: HTMLElement,
  property: string,
  value: number | undefined,
): void => {
  if (value === undefined) {
    element.style.removeProperty(property)
  } else {
    element.style.setProperty(property, `${value}px`)
  }
}

/** Positions a floating element relative to its button using Floating UI, then
 *  returns a cleanup function. Designed to be called inside an `OnMount`
 *  action: the consumer wraps the call in `Effect.sync` and stashes the
 *  returned cleanup in the `Mount` result. When `interceptTab` is true
 *  (default), Tab key in portal mode refocuses the button. Set to false for
 *  components like Popover where Tab should navigate naturally within the
 *  panel. When `focusAfterPosition` is true, the element is focused after the
 *  first position computation clears visibility, deferred via
 *  requestAnimationFrame so the element is painted before focus fires.
 *  `focusSelector` optionally targets a descendant (e.g. a calendar grid
 *  inside a popover panel) instead of the panel itself.
 *  The side the element currently sits on is written to `data-placement`, so
 *  CSS can react to it. When `isPlacementLocked` is true, the element keeps the
 *  side that the first positioning picks, `flip` is removed from every later
 *  update, and `data-placement` holds that locked side. Otherwise the attribute
 *  tracks the side each update resolves to, including the ones `flip` moves. */
export const anchorSetup = (
  element: Element,
  config: SetupConfig,
): (() => void) => {
  // NOTE: resolve the button and any focus target within the element's own
  // root, which is a shadow root when the app is hosted in one (e.g. the
  // DevTools overlay isolates its UI in a shadow root). document.getElementById
  // and document.querySelector do not pierce shadow boundaries, so a
  // document-scoped lookup returns null there and the panel never anchors.
  const root = element.getRootNode()
  const inShadow = root instanceof ShadowRoot
  const owner = inShadow ? root : document
  const button = owner.getElementById(config.buttonId)

  if (!(button instanceof HTMLElement) || !(element instanceof HTMLElement)) {
    return Function.constVoid
  }

  const isPortal = config.anchor.portal ?? true
  const portalCleanup = isPortal ? portalToContainingRoot(element) : undefined

  // NOTE: inside a shadow root the panel's offsetParent resolves to the
  // light-DOM host element, so Floating UI's absolute strategy mis-measures
  // its position. The fixed strategy is viewport-relative and sidesteps the
  // offsetParent entirely. Light-DOM apps keep the absolute strategy.
  const strategy = inShadow ? 'fixed' : 'absolute'
  if (inShadow) {
    element.style.position = 'fixed'
  }

  const maybeArrowElement = pipe(
    Option.fromNullishOr(config.arrowId),
    Option.flatMapNullishOr(arrowId => owner.getElementById(arrowId)),
    Option.filter(candidate => candidate instanceof HTMLElement),
  )

  const arrowMiddleware = Option.match(maybeArrowElement, {
    onNone: () => [],
    onSome: arrowElement => [
      arrow({ element: arrowElement, padding: config.arrowPadding ?? 0 }),
    ],
  })

  const {
    placement,
    gap,
    offset: crossAxis,
    padding,
    isPlacementLocked,
  } = config.anchor
  const shouldInterceptTab = config.interceptTab ?? true
  const isPlacementLockEnabled = isPlacementLocked ?? false

  let isFirstUpdate = true
  let isActive = true
  let isPositioning = false
  let isPositioningQueued = false
  let hasWarnedFailure = false
  let lockedPlacement: FloatingPlacement | undefined

  const positionElement = (): void => {
    if (!isActive) {
      return
    }

    // NOTE: with the current `@floating-ui/dom` a tick settles inside a
    // microtask chain and each `autoUpdate` callback returns through a
    // microtask checkpoint, so this never engages. It holds the invariant by
    // construction if that changes.
    if (isPositioning) {
      isPositioningQueued = true
      return
    }

    const isLocked = isPlacementLockEnabled && lockedPlacement !== undefined
    const requestedPlacement = lockedPlacement ?? placement ?? 'bottom-start'

    // NOTE: the promise is built before the gate closes, so a synchronous
    // throw from `computePosition` or a middleware factory cannot leave
    // `isPositioning` latched with no `finally` attached to release it. That
    // would wedge every later tick behind the gate.
    const tick = computePosition(button, element, {
      placement: requestedPlacement,
      strategy,
      middleware: [
        floatingOffset({
          mainAxis: gap ?? 0,
          crossAxis: crossAxis ?? 0,
        }),
        ...(isLocked ? [] : [flip({ padding: padding ?? 0 })]),
        shift({ padding: padding ?? 0 }),
        size({
          padding: padding ?? 0,
          apply({ rects, availableHeight }) {
            if (!isActive) {
              return
            }

            element.style.setProperty(
              '--button-width',
              `${rects.reference.width}px`,
            )
            element.style.maxHeight = `${Math.max(0, availableHeight)}px`
            element.style.overflowY = 'auto'
            element.style.overscrollBehavior = 'none'
          },
        }),
        // NOTE: `arrow` runs last. Sitting after `shift` is the constraint: an
        // offset computed before `shift` would ignore the displacement `shift`
        // applied, which is the case this hook exists to handle. Order against
        // `size` is free, since `size.apply` writes the panel's maxHeight
        // without rewriting the rects `arrow` reads.
        ...arrowMiddleware,
      ],
    })

    isPositioning = true

    tick
      .then(
        ({ x, y, placement: resolvedPlacement, middlewareData }) => {
          hasWarnedFailure = false

          if (!isActive) {
            return
          }

          element.style.left = `${x}px`
          element.style.top = `${y}px`

          if (isPlacementLockEnabled) {
            lockedPlacement = lockedPlacement ?? resolvedPlacement
          }

          element.setAttribute(
            'data-placement',
            toSide(lockedPlacement ?? resolvedPlacement),
          )

          if (Option.isSome(maybeArrowElement)) {
            const { x: arrowX, y: arrowY } = middlewareData.arrow ?? {}
            setOrRemoveLength(element, '--arrow-x', arrowX)
            setOrRemoveLength(element, '--arrow-y', arrowY)
          }

          if (isFirstUpdate) {
            isFirstUpdate = false
            element.style.visibility = ''

            if (config.focusAfterPosition ?? false) {
              requestAnimationFrame(() => {
                if (!isActive) {
                  return
                }

                const target = config.focusSelector
                  ? owner.querySelector(config.focusSelector)
                  : element
                if (target instanceof HTMLElement) {
                  target.focus()
                }
              })
            }
          }
        },
        // NOTE: `computePosition` awaits platform measurement and every
        // middleware, so a throw in any of them rejects the tick. Reported
        // once per run of consecutive failures, since `autoUpdate` would
        // otherwise repeat a persistent failure on every scroll and resize,
        // while a fresh failure after a recovery still gets its own report.
        (error: unknown) => {
          if (!hasWarnedFailure) {
            hasWarnedFailure = true
            console.error(
              '[@foldkit/ui] anchorSetup could not position the panel. It keeps the visibility its caller rendered until positioning succeeds.',
              error,
            )
          }
        },
      )
      .finally(() => {
        isPositioning = false

        if (isActive && isPositioningQueued) {
          isPositioningQueued = false
          positionElement()
        }
      })
  }

  const floatingCleanup = autoUpdate(button, element, positionElement)

  const handleTabKey = (event: Event): void => {
    if (event instanceof KeyboardEvent && event.key === 'Tab') {
      button.focus()
    }
  }

  const isTabIntercepted = isPortal && shouldInterceptTab
  if (isTabIntercepted) {
    element.addEventListener('keydown', handleTabKey)
  }

  return () => {
    isActive = false
    isPositioningQueued = false
    floatingCleanup()

    if (isTabIntercepted) {
      element.removeEventListener('keydown', handleTabKey)
    }

    element.removeAttribute('data-placement')
    element.style.removeProperty('--arrow-x')
    element.style.removeProperty('--arrow-y')

    portalCleanup?.()
  }
}
