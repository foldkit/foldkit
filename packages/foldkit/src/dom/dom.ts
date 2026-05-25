import {
  Array,
  Effect,
  Equal,
  Function,
  Match as M,
  Number,
  Option,
} from 'effect'

import { afterCommit, afterPaint } from '../render/render.js'
import { ElementNotFound } from './error.js'

const BASE_DIALOG_Z_INDEX = 2147483600
let openDialogCount = 0

const dialogCleanups = new WeakMap<HTMLDialogElement, () => void>()

const FOCUSABLE_SELECTOR = Array.join(
  [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
  ],
  ', ',
)

const queryHTMLElement = (
  selector: string,
): Effect.Effect<HTMLElement, ElementNotFound> =>
  Effect.suspend(() => {
    const element = document.querySelector(selector)
    return element instanceof HTMLElement
      ? Effect.succeed(element)
      : Effect.fail(new ElementNotFound({ selector }))
  })

/**
 * Focuses an element matching the given selector after the next render has
 * committed.
 *
 * Use `Dom.focus` inside a Command for focus that's caused by a Message
 * dispatching: a dialog opening, an input becoming the active step in a
 * form, returning focus to a trigger button after a popover closes,
 * keyboard navigation across a stable layout. The Command fires from
 * `update`'s return; the focus runs after the next render commits, so the
 * element is in place by the time `.focus()` runs.
 *
 * Do not use `OnMount` for focus. The cause of focus-on-open is the
 * Message, not the element appearing. Mount is for per-instance lifecycle
 * effects bound to a VNode existing where the live element handle is
 * needed (positioning, portaling, observer attachment, library setup).
 *
 * Section headings, articles, and other non-natively-focusable elements
 * are common URL fragment targets, but `.focus()` is a no-op on them
 * without a `tabindex`. Pass `makeFocusable: true` to inject
 * `tabindex="-1"` on the target if it has none, making programmatic
 * focus actually land. Pass `preventScroll: true` to suppress the
 * browser's default scroll-on-focus, useful when the focus call follows
 * a deliberate scroll that should not be undone. The two options compose
 * with `scrollIntoViewAfterPaint` for URL-fragment-navigation
 * accessibility: scroll the section into view, then focus the same
 * selector so keyboard users start Tab navigation from the target.
 *
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Dom.focus('#email-input')
 * Dom.focus('#section', { preventScroll: true, makeFocusable: true })
 * ```
 */
export const focus = (
  selector: string,
  options?: Readonly<{ preventScroll?: boolean; makeFocusable?: boolean }>,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterCommit
    const element = yield* queryHTMLElement(selector)
    if (options?.makeFocusable && !element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '-1')
    }
    element.focus({ preventScroll: options?.preventScroll ?? false })
  })

/**
 * Opens a dialog element using `show()` with high z-index, focus trapping,
 * and Escape key handling. Uses `show()` instead of `showModal()` so that
 * DevTools (and any other high-z-index overlay) remains interactive. The
 * Dialog component provides its own backdrop, scroll locking, and transitions.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLDialogElement`.
 *
 * Pass `focusSelector` to focus an element inside the dialog when it opens.
 *
 * @example
 * ```typescript
 * Dom.showModal('#my-dialog')
 * Dom.showModal('#my-dialog', { focusSelector: '#search-input' })
 * ```
 */
export const showModal = (
  selector: string,
  options?: Readonly<{ focusSelector?: string }>,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterCommit

    const element = document.querySelector(selector)

    if (!(element instanceof HTMLDialogElement)) {
      return yield* Effect.fail(new ElementNotFound({ selector }))
    }

    element.style.position = 'fixed'
    element.style.inset = '0'
    openDialogCount++
    element.style.zIndex = String(BASE_DIALOG_Z_INDEX + openDialogCount)
    element.show()

    const handleKeydown = (event: KeyboardEvent): void => {
      if (!element.open) {
        return
      }

      M.value(event.key).pipe(
        M.when('Escape', () => {
          if (event.defaultPrevented) {
            return
          }

          event.preventDefault()
          element.dispatchEvent(new Event('cancel', { cancelable: true }))
        }),
        M.when('Tab', () => {
          trapFocusWithinDialog(event, element)
        }),
        M.orElse(Function.constVoid),
      )
    }

    document.addEventListener('keydown', handleKeydown)
    dialogCleanups.set(element, () =>
      document.removeEventListener('keydown', handleKeydown),
    )

    if (options?.focusSelector) {
      const focusTarget = element.querySelector(options.focusSelector)
      if (focusTarget instanceof HTMLElement) {
        focusTarget.focus()
      }
    }
  })

const trapFocusWithinDialog = (
  event: KeyboardEvent,
  dialog: HTMLDialogElement,
): void => {
  const focusable = Array.fromIterable(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  )
  if (Array.isReadonlyArrayNonEmpty(focusable)) {
    const first = Array.headNonEmpty(focusable)
    const last = Array.lastNonEmpty(focusable)

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

/**
 * Closes a dialog element using `.close()`.
 * Cleans up the keyboard handlers installed by `showModal`.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLDialogElement`.
 *
 * @example
 * ```typescript
 * Dom.closeModal('#my-dialog')
 * ```
 */
export const closeModal = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.suspend(() => {
    const element = document.querySelector(selector)
    if (element instanceof HTMLDialogElement) {
      element.close()
      openDialogCount = Math.max(0, openDialogCount - 1)
      const cleanup = dialogCleanups.get(element)
      if (cleanup) {
        cleanup()
        dialogCleanups.delete(element)
      }
      return Effect.void
    }
    return Effect.fail(new ElementNotFound({ selector }))
  })

/**
 * Programmatically clicks an element matching the given selector.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Dom.clickElement('#menu-item-2')
 * ```
 */
export const clickElement = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterCommit
    const element = yield* queryHTMLElement(selector)
    element.click()
  })

/**
 * Scrolls an element into view by selector. Resolves the selector after
 * `Render.afterCommit`. Defaults to `{ block: 'nearest' }`; pass a different
 * `block` for use cases like URL-fragment landing where `'start'` is right.
 * For a target the same Message just brought into the DOM,
 * `scrollIntoViewAfterPaint` is the right choice.
 *
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Dom.scrollIntoView('#active-item')
 * Dom.scrollIntoView('#section-2', { block: 'start' })
 * ```
 */
export const scrollIntoView = (
  selector: string,
  options?: Readonly<{ block?: ScrollLogicalPosition }>,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterCommit
    const element = yield* queryHTMLElement(selector)
    element.scrollIntoView({ block: options?.block ?? 'nearest' })
  })

/**
 * Like `scrollIntoView`, but waits for `Render.afterPaint` instead of
 * `Render.afterCommit` before resolving the selector.
 *
 * Reach for this when the target was just brought into the DOM by the same
 * Message that dispatches the scroll, such as a routing flow landing at a
 * URL fragment. The two-frame wait gives the runtime time to commit the new
 * Model and the browser time to lay it out before the scroll runs. For a
 * target that's already on screen, `scrollIntoView` is the lighter choice.
 *
 * Defaults to `{ block: 'nearest' }`; pass `{ block: 'start' }` for URL
 * fragment landings where the target should sit at the top of the viewport.
 *
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Dom.scrollIntoViewAfterPaint('#overview')
 * Dom.scrollIntoViewAfterPaint(`#${hash}`, { block: 'start' })
 * ```
 */
export const scrollIntoViewAfterPaint = (
  selector: string,
  options?: Readonly<{ block?: ScrollLogicalPosition }>,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterPaint
    const element = yield* queryHTMLElement(selector)
    element.scrollIntoView({ block: options?.block ?? 'nearest' })
  })

/** Direction for focus advancement: forward or backward in tab order. */
export type FocusDirection = 'Next' | 'Previous'

/**
 * Focuses the next or previous focusable element in the document relative to the element matching the given selector.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Dom.advanceFocus('#menu-button', 'Next')
 * ```
 */
export const advanceFocus = (
  selector: string,
  direction: FocusDirection,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterCommit

    const reference = yield* queryHTMLElement(selector)

    const focusableElements = Array.fromIterable(
      document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    )

    const referenceElementIndex = Array.findFirstIndex(
      focusableElements,
      Equal.equals(reference),
    )

    if (Option.isNone(referenceElementIndex)) {
      return yield* Effect.fail(new ElementNotFound({ selector }))
    }

    const offsetReferenceElementIndex = M.value(direction).pipe(
      M.when('Next', () => Number.increment),
      M.when('Previous', () => Number.decrement),
      M.exhaustive,
    )(referenceElementIndex.value)

    const nextElement = Array.get(
      focusableElements,
      offsetReferenceElementIndex,
    )

    if (Option.isSome(nextElement)) {
      nextElement.value.focus()
    }
  })
