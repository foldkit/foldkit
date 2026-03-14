import { Array, Effect, Equal, Match as M, Number, Option } from 'effect'

import { ElementNotFound } from './error'

const FOCUSABLE_SELECTOR = Array.join(
  [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
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
 * Opens a dialog element as a modal using `showModal()`.
 * Uses requestAnimationFrame to ensure the DOM is updated before attempting to show.
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
        element.showModal()
        resume(Effect.void)
      } else {
        resume(Effect.fail(new ElementNotFound({ selector })))
      }
    })
  })

/**
 * Closes a dialog element using `.close()`.
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
