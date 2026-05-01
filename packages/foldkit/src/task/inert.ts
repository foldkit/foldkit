import { Array, Effect, Number, Option, Predicate, pipe } from 'effect'

import { OptionExt } from '../effectExtensions/index.js'

const inertState = {
  originals: new Map<
    HTMLElement,
    { ariaHidden: string | null; inert: boolean }
  >(),
  counts: new Map<HTMLElement, number>(),
  cleanups: new Map<string, ReadonlyArray<() => void>>(),
}

const markInert = (element: HTMLElement): (() => void) => {
  const count = inertState.counts.get(element) ?? 0
  inertState.counts.set(element, Number.increment(count))

  if (count === 0) {
    inertState.originals.set(element, {
      ariaHidden: element.getAttribute('aria-hidden'),
      inert: element.inert,
    })

    element.setAttribute('aria-hidden', 'true')
    element.inert = true
  }

  return () => markNotInert(element)
}

const markNotInert = (element: HTMLElement): void => {
  const count = inertState.counts.get(element) ?? 1

  if (count === 1) {
    const original = inertState.originals.get(element)

    if (original) {
      if (Predicate.isNull(original.ariaHidden)) {
        element.removeAttribute('aria-hidden')
      } else {
        element.setAttribute('aria-hidden', original.ariaHidden)
      }

      element.inert = original.inert
      inertState.originals.delete(element)
    }

    inertState.counts.delete(element)
  } else {
    inertState.counts.set(element, Number.decrement(count))
  }
}

const resolveElements = (
  selectors: ReadonlyArray<string>,
): ReadonlyArray<HTMLElement> =>
  Array.filterMap(selectors, selector => {
    const element = document.querySelector(selector)
    return OptionExt.asResult(
      element instanceof HTMLElement ? Option.some(element) : Option.none(),
    )
  })

const ancestorsUpToBody = (element: HTMLElement): ReadonlyArray<HTMLElement> =>
  Array.unfold(element.parentElement, current =>
    Predicate.isNotNull(current)
      ? Option.some([
          current,
          current === document.body ? null : current.parentElement,
        ])
      : Option.none(),
  )

const inertableSiblings = (
  parent: HTMLElement,
  allowedElements: ReadonlyArray<HTMLElement>,
): ReadonlyArray<HTMLElement> =>
  pipe(
    parent.children,
    Array.fromIterable,
    Array.filterMap(child =>
      OptionExt.asResult(
        child instanceof HTMLElement &&
          !Array.some(allowedElements, allowed => child.contains(allowed))
          ? Option.some(child)
          : Option.none(),
      ),
    ),
  )

/**
 * Marks all DOM elements outside the given selectors as `inert` and
 * `aria-hidden="true"`. Walks each allowed element up to `document.body`,
 * marking siblings that don't contain an allowed element. Uses reference
 * counting so nested calls are safe.
 *
 * @example
 * ```typescript
 * Task.inertOthers('my-menu', ['#menu-button', '#menu-items']).pipe(
 *   Effect.as(CompletedSetupInert()),
 * )
 * ```
 */
export const inertOthers = (
  id: string,
  allowedSelectors: ReadonlyArray<string>,
): Effect.Effect<void> =>
  Effect.sync(() => {
    const allowedElements = resolveElements(allowedSelectors)

    const cleanupFunctions = pipe(
      allowedElements,
      Array.flatMap(ancestorsUpToBody),
      Array.flatMap(ancestor =>
        Array.map(inertableSiblings(ancestor, allowedElements), markInert),
      ),
    )

    inertState.cleanups.set(id, cleanupFunctions)
  })

/**
 * Restores all elements previously marked inert by `inertOthers` for the
 * given ID. Safe to call without a preceding `inertOthers` — acts as a no-op.
 *
 * @example
 * ```typescript
 * Task.restoreInert('my-menu').pipe(Effect.as(CompletedTeardownInert()))
 * ```
 */
export const restoreInert = (id: string): Effect.Effect<void> =>
  Effect.sync(() => {
    const cleanupFunctions = inertState.cleanups.get(id)

    if (cleanupFunctions) {
      Array.forEach(cleanupFunctions, cleanup => cleanup())
      inertState.cleanups.delete(id)
    }
  })
