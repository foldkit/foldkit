import {
  Array,
  Effect,
  Equal,
  Function,
  Match as M,
  Number,
  Option,
} from 'effect'

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

// NOTE: DOM tasks await one rAF before walking the tree. The runtime defers
// renders to the next animation frame and forks Commands on the microtask
// queue, so without this wait a Task that runs immediately after a dirtying
// Message would query the DOM before the matching VDOM patch has committed.
const awaitNextFrame: Effect.Effect<void> = Effect.callback<void>(resume => {
  const handle = requestAnimationFrame(() => resume(Effect.void))
  return Effect.sync(() => cancelAnimationFrame(handle))
})

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
 * Use `Task.focus` inside a Command for focus that's caused by a Message
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
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Task.focus('#email-input').pipe(Effect.ignore, Effect.as(CompletedFocusInput()))
 * ```
 */
export const focus = (selector: string): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* awaitNextFrame
    const element = yield* queryHTMLElement(selector)
    element.focus()
  })

/**
 * Opens a dialog element using `show()` with high z-index, focus trapping,
 * and Escape key handling. Uses `show()` instead of `showModal()` so that
 * DevTools (and any other high-z-index overlay) remains interactive — the
 * Dialog component provides its own backdrop, scroll locking, and transitions.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLDialogElement`.
 *
 * Pass `focusSelector` to focus an element inside the dialog when it opens.
 *
 * @example
 * ```typescript
 * Task.showModal('#my-dialog').pipe(Effect.ignore, Effect.as(CompletedShowDialog()))
 * Task.showModal('#my-dialog', { focusSelector: '#search-input' }).pipe(Effect.ignore, Effect.as(CompletedShowDialog()))
 * ```
 */
export const showModal = (
  selector: string,
  options?: Readonly<{ focusSelector?: string }>,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* awaitNextFrame

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
 * Task.closeModal('#my-dialog').pipe(Effect.ignore, Effect.as(CompletedCloseDialog()))
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
 * Task.clickElement('#menu-item-2').pipe(Effect.ignore, Effect.as(CompletedClickItem()))
 * ```
 */
export const clickElement = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* awaitNextFrame
    const element = yield* queryHTMLElement(selector)
    element.click()
  })

/**
 * Scrolls an element into view by selector using `{ block: 'nearest' }`.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Task.scrollIntoView('#active-item').pipe(Effect.ignore, Effect.as(CompletedScrollIntoView()))
 * ```
 */
export const scrollIntoView = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* awaitNextFrame
    const element = yield* queryHTMLElement(selector)
    element.scrollIntoView({ block: 'nearest' })
  })

/** Direction for focus advancement — forward or backward in tab order. */
export type FocusDirection = 'Next' | 'Previous'

/**
 * Focuses the next or previous focusable element in the document relative to the element matching the given selector.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Task.advanceFocus('#menu-button', 'Next').pipe(Effect.ignore, Effect.as(CompletedAdvanceFocus()))
 * ```
 */
export const advanceFocus = (
  selector: string,
  direction: FocusDirection,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* awaitNextFrame

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
