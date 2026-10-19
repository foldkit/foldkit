import { Array, Effect, Number, Option, Predicate, Result, pipe } from 'effect'

import { afterCommit } from '../render/render.js'

const inertState = {
  originals: new Map<
    HTMLElement,
    { ariaHidden: string | null; inert: boolean }
  >(),
  counts: new Map<HTMLElement, number>(),
  cleanups: new Map<string, ReadonlyArray<() => void>>(),
  requests: new Map<string, symbol>(),
}

type InertAttribute = 'aria-hidden' | 'inert'

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

const recordCurrentAttribute = (
  element: HTMLElement,
  attributeName: InertAttribute,
): void => {
  const original = inertState.originals.get(element)
  if (original === undefined) {
    return
  }

  if (attributeName === 'aria-hidden') {
    inertState.originals.set(element, {
      ...original,
      ariaHidden: element.getAttribute('aria-hidden'),
    })
  } else {
    inertState.originals.set(element, {
      ...original,
      inert: element.inert,
    })
  }
}

const resolveElements = (
  selectors: ReadonlyArray<string>,
): ReadonlyArray<HTMLElement> =>
  Array.filterMap(selectors, selector =>
    Result.liftPredicate(
      document.querySelector(selector),
      (element): element is HTMLElement => element instanceof HTMLElement,
      () => undefined,
    ),
  )

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
      child instanceof HTMLElement &&
      !Array.some(allowedElements, allowed => child.contains(allowed))
        ? Result.succeed(child)
        : Result.failVoid,
    ),
  )

const outsideCandidates = (
  allowedElements: ReadonlyArray<HTMLElement>,
): Set<HTMLElement> => {
  const candidates = new Set<HTMLElement>()

  for (const allowedElement of allowedElements) {
    for (const ancestor of ancestorsUpToBody(allowedElement)) {
      for (const sibling of inertableSiblings(ancestor, allowedElements)) {
        candidates.add(sibling)
      }
    }
  }

  return candidates
}

export const makeOutsideIsolation = (): Readonly<{
  update: (allowedElements: ReadonlyArray<HTMLElement>) => void
  contains: (element: HTMLElement) => boolean
  recordAttributeMutation: (
    element: HTMLElement,
    attributeName: InertAttribute,
  ) => void
  dispose: () => void
}> => {
  const cleanups = new Map<HTMLElement, () => void>()

  return {
    update: allowedElements => {
      const candidates = outsideCandidates(allowedElements)

      for (const [element, cleanup] of cleanups) {
        if (!candidates.has(element)) {
          cleanup()
          cleanups.delete(element)
        }
      }

      for (const element of candidates) {
        if (!cleanups.has(element)) {
          cleanups.set(element, markInert(element))
        } else {
          if (element.getAttribute('aria-hidden') !== 'true') {
            element.setAttribute('aria-hidden', 'true')
          }

          if (!element.inert) {
            element.inert = true
          }
        }
      }
    },
    contains: element => cleanups.has(element),
    recordAttributeMutation: (element, attributeName) => {
      if (cleanups.has(element)) {
        recordCurrentAttribute(element, attributeName)
      }
    },
    dispose: () => {
      for (const cleanup of cleanups.values()) {
        cleanup()
      }
      cleanups.clear()
    },
  }
}

export const isolateOutsideElements = (
  allowedElements: ReadonlyArray<HTMLElement>,
): (() => void) => {
  const isolation = makeOutsideIsolation()
  isolation.update(allowedElements)

  return isolation.dispose
}

/**
 * Marks all DOM elements outside the given selectors as `inert` and
 * `aria-hidden="true"`. Walks each allowed element up to `document.body`,
 * marking siblings that don't contain an allowed element. Uses reference
 * counting so nested calls are safe. A restore before the pending render
 * commits invalidates the request before it can change the DOM.
 *
 * @example
 * ```typescript
 * Dom.inertOthers('my-menu', ['#menu-button', '#menu-items'])
 * ```
 */
export const inertOthers = (
  id: string,
  allowedSelectors: ReadonlyArray<string>,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const request = yield* Effect.sync(() => {
      const nextRequest = Symbol()
      inertState.requests.set(id, nextRequest)
      return nextRequest
    })

    yield* afterCommit

    if (inertState.requests.get(id) !== request) {
      return
    }

    const allowedElements = resolveElements(allowedSelectors)

    inertState.cleanups.set(id, [isolateOutsideElements(allowedElements)])
  })

/**
 * Restores all elements previously marked inert by `inertOthers` for the
 * given ID. Safe to call without a preceding `inertOthers`. Acts as a no-op
 * in that case.
 *
 * @example
 * ```typescript
 * Dom.restoreInert('my-menu')
 * ```
 */
export const restoreInert = (id: string): Effect.Effect<void> =>
  Effect.sync(() => {
    inertState.requests.delete(id)

    const cleanupFunctions = inertState.cleanups.get(id)

    if (cleanupFunctions) {
      Array.forEach(cleanupFunctions, cleanup => cleanup())
      inertState.cleanups.delete(id)
    }
  })
