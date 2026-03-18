import {
  Array,
  Effect,
  Equal,
  Function,
  Match as M,
  Number,
  Option,
} from 'effect'

import { ElementNotFound } from './error'

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

/**
 * Focuses an element matching the given selector.
 * Uses requestAnimationFrame to ensure the DOM is updated before attempting to focus.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Task.focus('#email-input').pipe(Effect.ignore, Effect.as(CompletedInputFocus()))
 * ```
 */
export const focus = (selector: string): Effect.Effect<void, ElementNotFound> =>
  Effect.async<void, ElementNotFound>(resume => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLElement) {
        element.focus()
        resume(Effect.void)
      } else {
        resume(Effect.fail(new ElementNotFound({ selector })))
      }
    })
  })

/**
 * Sets up a dialog element with high z-index, focus trapping, and Escape key
 * handling. Uses requestAnimationFrame to ensure the DOM is updated before
 * installing handlers. The Dialog component's view sets the native `open`
 * property synchronously during patch, so this command only manages z-index
 * stacking and keyboard behavior.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLDialogElement`.
 *
 * @example
 * ```typescript
 * Task.showModal('#my-dialog').pipe(Effect.ignore, Effect.as(CompletedDialogShow()))
 * ```
 */
export const showModal = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.async<void, ElementNotFound>(resume => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLDialogElement) {
        openDialogCount++
        element.style.zIndex = String(BASE_DIALOG_Z_INDEX + openDialogCount)

        if (!element.open) {
          element.show()
        }

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

        resume(Effect.void)
      } else {
        resume(Effect.fail(new ElementNotFound({ selector })))
      }
    })
  })

const trapFocusWithinDialog = (
  event: KeyboardEvent,
  dialog: HTMLDialogElement,
): void => {
  const focusable = Array.fromIterable(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  )
  if (Array.isNonEmptyArray(focusable)) {
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
 * Uses requestAnimationFrame to ensure the DOM is updated before attempting to close.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLDialogElement`.
 *
 * @example
 * ```typescript
 * Task.closeModal('#my-dialog').pipe(Effect.ignore, Effect.as(CompletedDialogClose()))
 * ```
 */
export const closeModal = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.async<void, ElementNotFound>(resume => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLDialogElement) {
        element.close()
        openDialogCount = Math.max(0, openDialogCount - 1)
        const cleanup = dialogCleanups.get(element)
        if (cleanup) {
          cleanup()
          dialogCleanups.delete(element)
        }
        resume(Effect.void)
      } else {
        resume(Effect.fail(new ElementNotFound({ selector })))
      }
    })
  })

/**
 * Programmatically clicks an element matching the given selector.
 * Uses requestAnimationFrame to ensure the DOM is updated before attempting to click.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Task.clickElement('#menu-item-2').pipe(Effect.ignore, Effect.as(CompletedItemClick()))
 * ```
 */
export const clickElement = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.async<void, ElementNotFound>(resume => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLElement) {
        element.click()
        resume(Effect.void)
      } else {
        resume(Effect.fail(new ElementNotFound({ selector })))
      }
    })
  })

/**
 * Scrolls an element into view by selector using `{ block: 'nearest' }`.
 * Uses requestAnimationFrame to ensure the DOM is updated before attempting to scroll.
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
  Effect.async<void, ElementNotFound>(resume => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)

      if (element instanceof HTMLElement) {
        element.scrollIntoView({ block: 'nearest' })
        resume(Effect.void)
      } else {
        resume(Effect.fail(new ElementNotFound({ selector })))
      }
    })
  })

/** Direction for focus advancement — forward or backward in tab order. */
export type FocusDirection = 'Next' | 'Previous'

/**
 * Focuses the next or previous focusable element in the document relative to the element matching the given selector.
 * Uses requestAnimationFrame to ensure the DOM is updated before querying focus order.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Task.advanceFocus('#menu-button', 'Next').pipe(Effect.ignore, Effect.as(CompletedFocusAdvance()))
 * ```
 */
export const advanceFocus = (
  selector: string,
  direction: FocusDirection,
): Effect.Effect<void, ElementNotFound> =>
  Effect.async<void, ElementNotFound>(resume => {
    requestAnimationFrame(() => {
      const reference = document.querySelector(selector)

      if (!(reference instanceof HTMLElement)) {
        return resume(Effect.fail(new ElementNotFound({ selector })))
      }

      const focusableElements = Array.fromIterable(
        document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )

      const referenceElementIndex = Array.findFirstIndex(
        focusableElements,
        Equal.equals(reference),
      )

      if (Option.isNone(referenceElementIndex)) {
        return resume(Effect.fail(new ElementNotFound({ selector })))
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

      resume(Effect.void)
    })
  })
