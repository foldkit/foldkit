import {
  Array,
  Effect,
  Equal,
  Function,
  Match,
  Number,
  Option,
  Result,
} from 'effect'

import { afterCommit, afterPaint } from '../render/render.js'
import { DialogRuntime } from './dialogRuntime.js'
import { ElementNotFound } from './error.js'
import { makeOutsideIsolation } from './inert.js'
import { unlockScroll } from './scrollLock.js'

const BASE_DIALOG_Z_INDEX = 2147483600
let openDialogCount = 0

// NOTE: keyed by the dialog's id (string), not by the element object, because
// the unmount backstop must reclaim these resources after the `<dialog>` has
// already left the DOM (navigation away from a route-keyed subtree), when no
// live element is addressable. Membership in this map is the per-dialog "holds
// hygiene" flag, read-and-deleted to make release exactly-once.
type DialogHygiene = Readonly<{
  removeKeydownListener: () => void
  unregisterOwner: (() => void) | undefined
  returnFocus: HTMLElement | undefined
}>

const dialogHygieneById = new Map<string, DialogHygiene>()

type OpenDialog = Readonly<{
  id: string
  element: HTMLDialogElement
  isModal: boolean
  allowedOutsideSelectors: ReadonlyArray<string>
}>

let openDialogStack: ReadonlyArray<OpenDialog> = []
let modalIsolation: ReturnType<typeof makeOutsideIsolation> | undefined
let modalObserver: MutationObserver | undefined
let modalAllowedElements: ReadonlyArray<HTMLElement> = []
let modalAllowedOutsideElements: ReadonlyArray<HTMLElement> = []
let modalAllowedSelectors: ReadonlyArray<string> = []
let modalAllowedAncestors = new Set<HTMLElement>()

const containsAllowedSelector = (node: Node): boolean => {
  if (!(node instanceof Element || node instanceof DocumentFragment)) {
    return false
  }

  return Array.some(modalAllowedSelectors, selector => {
    try {
      return (
        (node instanceof Element && node.matches(selector)) ||
        node.querySelector(selector) !== null
      )
    } catch {
      return false
    }
  })
}

const containsCurrentAllowedElement = (node: Node): boolean =>
  Array.some(modalAllowedElements, element => node.contains(element))

const isRelevantModalMutation = (mutation: MutationRecord): boolean => {
  if (
    mutation.type === 'attributes' &&
    (mutation.attributeName === 'aria-hidden' ||
      mutation.attributeName === 'inert')
  ) {
    return (
      mutation.target instanceof HTMLElement &&
      modalIsolation?.contains(mutation.target) === true
    )
  }

  if (mutation.type === 'attributes') {
    return (
      Array.some(modalAllowedOutsideElements, element =>
        mutation.target.contains(element),
      ) || containsAllowedSelector(mutation.target)
    )
  }

  const changedNodes = [
    ...Array.fromIterable(mutation.addedNodes),
    ...Array.fromIterable(mutation.removedNodes),
  ]

  if (
    mutation.target instanceof HTMLElement &&
    modalAllowedAncestors.has(mutation.target) &&
    Array.some(changedNodes, node => node instanceof Element)
  ) {
    return true
  }

  return Array.some(
    changedNodes,
    node =>
      containsCurrentAllowedElement(node) || containsAllowedSelector(node),
  )
}

const ancestorsOfAllowedElements = (
  allowedElements: ReadonlyArray<HTMLElement>,
): Set<HTMLElement> => {
  const ancestors = new Set<HTMLElement>()

  for (const allowedElement of allowedElements) {
    let ancestor = allowedElement.parentElement

    while (ancestor !== null) {
      ancestors.add(ancestor)

      if (ancestor === document.body) {
        break
      }

      ancestor = ancestor.parentElement
    }
  }

  return ancestors
}

const recordModalAttributeMutations = (
  mutations: ReadonlyArray<MutationRecord>,
): void => {
  for (const mutation of mutations) {
    if (
      mutation.type === 'attributes' &&
      mutation.target instanceof HTMLElement &&
      (mutation.attributeName === 'aria-hidden' ||
        mutation.attributeName === 'inert')
    ) {
      modalIsolation?.recordAttributeMutation(
        mutation.target,
        mutation.attributeName,
      )
    }
  }
}

const synchronizeModalIsolation = (): void => {
  if (modalObserver !== undefined) {
    recordModalAttributeMutations(modalObserver.takeRecords())
  }

  modalObserver?.disconnect()

  const maybeTopmostModal = Array.last(
    Array.filter(openDialogStack, dialog => dialog.isModal),
  )
  if (Option.isNone(maybeTopmostModal)) {
    modalObserver?.disconnect()
    modalObserver = undefined
    modalIsolation?.dispose()
    modalIsolation = undefined
    modalAllowedElements = []
    modalAllowedOutsideElements = []
    modalAllowedSelectors = []
    modalAllowedAncestors = new Set()
    return
  }

  const { allowedOutsideSelectors } = maybeTopmostModal.value
  const dialogsAtOrAboveModal = Array.dropWhile(
    openDialogStack,
    dialog => dialog !== maybeTopmostModal.value,
  )
  const allowedOutsideElements = Array.filterMap(
    allowedOutsideSelectors,
    selector => {
      try {
        const outsideElement = document.querySelector(selector)
        return outsideElement instanceof HTMLElement
          ? Result.succeed(outsideElement)
          : Result.failVoid
      } catch {
        return Result.failVoid
      }
    },
  )

  const nextAllowedElements = [
    ...Array.map(dialogsAtOrAboveModal, dialog => dialog.element),
    ...allowedOutsideElements,
  ]

  modalIsolation ??= makeOutsideIsolation()
  modalIsolation.update(nextAllowedElements)
  modalAllowedElements = nextAllowedElements
  modalAllowedOutsideElements = allowedOutsideElements
  modalAllowedSelectors = allowedOutsideSelectors
  modalAllowedAncestors = ancestorsOfAllowedElements(nextAllowedElements)

  modalObserver ??= new MutationObserver(mutations => {
    if (Array.some(mutations, isRelevantModalMutation)) {
      recordModalAttributeMutations(mutations)
      synchronizeModalIsolation()
    }
  })
  modalObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  })
}

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

const isVisibleAndInteractiveElement = (element: HTMLElement): boolean =>
  element.closest('[hidden], [inert]') === null &&
  element.checkVisibility({ visibilityProperty: true })

const isFocusableElement = (element: Element): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) {
    return false
  }

  if (element.matches(':disabled')) {
    return false
  }

  if (element instanceof HTMLInputElement && element.type === 'hidden') {
    return false
  }

  if (element.tabIndex < 0 && !element.hasAttribute('tabindex')) {
    return false
  }

  return isVisibleAndInteractiveElement(element)
}

const focusableElementsWithin = (
  root: ParentNode,
): ReadonlyArray<HTMLElement> =>
  Array.filter(
    Array.fromIterable(root.querySelectorAll(FOCUSABLE_SELECTOR)),
    isFocusableElement,
  )

const isValidReturnFocus = (element: HTMLElement): boolean => {
  if (!document.contains(element)) {
    return false
  }

  if (element instanceof HTMLDialogElement) {
    return element.open && isVisibleAndInteractiveElement(element)
  }

  return isFocusableElement(element)
}

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
 * Waiting for the commit puts the element in the DOM. It does not make the
 * element focusable. `.focus()` is a no-op on an element that is not
 * rendered, so a target behind `visibility: hidden` or `display: none`
 * leaves focus where it was, with nothing to distinguish that from focus
 * having landed. This is worth knowing when something asynchronous reveals
 * the target after the render commits: a panel held at `visibility: hidden`
 * until a positioning library resolves its first layout is still hidden
 * when the Command runs, however long the Command waits. Focus a target
 * like that from whatever performs the reveal, which is the one place that
 * knows the element has become focusable. The Message still causes the
 * reveal, so the focus belongs to that Message rather than to a lifecycle
 * effect standing in for it.
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
 * and Escape key handling. An unhandled Escape on the topmost dialog dispatches
 * a `CustomEvent` named `cancel`, distinguishing it from native `cancel` events
 * while preserving the dialog event contract. Uses `show()` instead of
 * `showModal()` so that DevTools (and any other high-z-index overlay) remains
 * interactive. Pass `isModal: true` to make the background inert and hide it
 * from assistive technology. `allowedOutsideSelectors` keeps separate developer
 * overlays available while modal isolation is active. Stacked modal dialogs
 * isolate against the topmost one, and closing it restores the dialog beneath.
 * The Dialog component provides its own backdrop, scroll locking,
 * and transitions. Fails with `ElementNotFound` if the selector does not match
 * an `HTMLDialogElement`.
 *
 * Pass `focusSelector` to focus an element inside the dialog when it opens.
 * When it does not match a focusable element, or when none is provided, focus
 * falls back to the first focusable descendant and then to the dialog itself.
 *
 * Records the element that had focus when the dialog opened so `closeDialog`
 * can return focus there, the way `showModal()` would natively. Resolves to
 * `true` when it installs the dialog resources, or `false` when that id already
 * holds them. The latter makes concurrent lifecycle recovery and application
 * Commands safe without duplicating focus traps or stack entries.
 *
 * @example
 * ```typescript
 * Dom.showDialog('#my-dialog')
 * Dom.showDialog('#my-dialog', { focusSelector: '#search-input' })
 * Dom.showDialog('#my-dialog', { isModal: true })
 * ```
 */
export const showDialog = (
  selector: string,
  options?: Readonly<{
    focusSelector?: string
    isModal?: boolean
    allowedOutsideSelectors?: ReadonlyArray<string>
  }>,
): Effect.Effect<boolean, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterCommit

    const element = document.querySelector(selector)

    if (!(element instanceof HTMLDialogElement)) {
      return yield* Effect.fail(new ElementNotFound({ selector }))
    }

    const { id } = element
    const maybeDialogRuntime = yield* Effect.serviceOption(DialogRuntime)
    const existingHygiene = dialogHygieneById.get(id)

    if (existingHygiene !== undefined) {
      return false
    }

    element.style.position = 'fixed'
    element.style.inset = '0'

    const previouslyFocused = document.activeElement
    const returnFocus =
      previouslyFocused instanceof HTMLElement &&
      previouslyFocused !== document.body
        ? previouslyFocused
        : undefined

    element.show()

    openDialogCount++
    element.style.zIndex = String(BASE_DIALOG_Z_INDEX + openDialogCount)

    openDialogStack = Array.append(
      Array.filter(openDialogStack, dialog => dialog.element !== element),
      {
        id,
        element,
        isModal: options?.isModal ?? false,
        allowedOutsideSelectors: options?.allowedOutsideSelectors ?? [],
      },
    )

    synchronizeModalIsolation()

    const handleKeydown = (event: KeyboardEvent): void => {
      if (!element.open) {
        return
      }

      const isTopmost = Option.exists(
        Array.last(openDialogStack),
        topmost => topmost.element === element,
      )
      if (!isTopmost) {
        return
      }

      Match.value(event.key).pipe(
        Match.when('Escape', () => {
          if (event.defaultPrevented) {
            return
          }

          event.preventDefault()
          element.dispatchEvent(new CustomEvent('cancel', { cancelable: true }))
        }),
        Match.when('Tab', () => {
          trapFocusWithinDialog(event, element)
        }),
        Match.orElse(Function.constVoid),
      )
    }

    document.addEventListener('keydown', handleKeydown)
    dialogHygieneById.set(id, {
      removeKeydownListener: () =>
        document.removeEventListener('keydown', handleKeydown),
      unregisterOwner: Option.isSome(maybeDialogRuntime)
        ? () => maybeDialogRuntime.value.unregister(id)
        : undefined,
      returnFocus,
    })

    if (Option.isSome(maybeDialogRuntime)) {
      maybeDialogRuntime.value.register(id)
    }

    const focusTarget = findDialogFocusTarget(element, options?.focusSelector)
    focusTarget.focus()

    return true
  })

const findDialogFocusTarget = (
  dialog: HTMLDialogElement,
  focusSelector: string | undefined,
): HTMLElement => {
  if (focusSelector !== undefined) {
    const requestedFocusTarget = dialog.querySelector(focusSelector)
    if (
      requestedFocusTarget !== null &&
      isFocusableElement(requestedFocusTarget)
    ) {
      return requestedFocusTarget
    }
  }

  return Option.match(Array.head(focusableElementsWithin(dialog)), {
    onSome: Function.identity,
    onNone: () => dialog,
  })
}

const trapFocusWithinDialog = (
  event: KeyboardEvent,
  dialog: HTMLDialogElement,
): void => {
  const focusable = focusableElementsWithin(dialog)
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
  } else {
    event.preventDefault()
    dialog.focus()
  }
}

/**
 * Closes a dialog element using `.close()`.
 * Cleans up the keyboard handlers installed by `showDialog`, restores modal
 * background isolation, and then returns focus to the element that was focused
 * before the dialog opened (the trigger, or the dialog beneath it when closing
 * a stacked dialog).
 * Resolves to `true` when it released the keyboard handlers, the return
 * focus, and the stack entry.
 * Resolves to `false` when the dialog held none, for example when the close
 * runs before `showDialog` has installed them. A caller that unlocks page
 * scroll after the close should unlock only when the result is `true`.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLDialogElement`.
 *
 * @example
 * ```typescript
 * Dom.closeDialog('#my-dialog')
 * ```
 */
export const closeDialog = (
  selector: string,
): Effect.Effect<boolean, ElementNotFound> =>
  Effect.suspend(() => {
    const element = document.querySelector(selector)
    if (element instanceof HTMLDialogElement) {
      element.close()
      return Effect.succeed(releaseDialogHygieneById(element.id))
    }
    return Effect.fail(new ElementNotFound({ selector }))
  })

const releaseDialogHygieneById = (id: string): boolean => {
  const hygiene = dialogHygieneById.get(id)
  if (hygiene === undefined) {
    return false
  }

  const maybeReleasedDialog = Array.findFirst(
    openDialogStack,
    dialog => dialog.id === id,
  )
  const isTopmost = Option.exists(
    Array.last(openDialogStack),
    dialog => dialog.id === id,
  )

  if (Option.isSome(maybeReleasedDialog)) {
    for (const openDialog of openDialogStack) {
      if (openDialog.id === id) {
        continue
      }

      const openHygiene = dialogHygieneById.get(openDialog.id)
      const openReturnFocus = openHygiene?.returnFocus

      if (
        openHygiene !== undefined &&
        openReturnFocus !== undefined &&
        maybeReleasedDialog.value.element.contains(openReturnFocus)
      ) {
        dialogHygieneById.set(openDialog.id, {
          ...openHygiene,
          returnFocus: hygiene.returnFocus,
        })
      }
    }
  }

  openDialogStack = Array.filter(openDialogStack, dialog => dialog.id !== id)
  synchronizeModalIsolation()
  openDialogCount = Math.max(0, Number.decrement(openDialogCount))
  hygiene.removeKeydownListener()
  dialogHygieneById.delete(id)
  hygiene.unregisterOwner?.()

  const { returnFocus } = hygiene
  if (
    isTopmost &&
    returnFocus !== undefined &&
    isValidReturnFocus(returnFocus)
  ) {
    returnFocus.focus()
  }

  return true
}

/**
 * Releases the framework hygiene a dialog holds while open: the focus-trap
 * keyboard handler, modal background isolation, the recorded return focus,
 * the dialog stack entry, the z-index counter, and one page scroll lock.
 * Use this when the element is removed without a close Message, such as
 * navigation away from a route-keyed subtree. The runtime also calls it
 * directly on disposal. The normal close path already releases these.
 * That path is `closeDialog` first, then the Dialog component's scroll unlock
 * when `closeDialog` reports a release. This function is the cleanup for the
 * case where no close Message ever reaches `update`.
 *
 * Addressed by the dialog's id, not a selector, because the element is
 * typically already gone from the DOM by the time this runs (that is the whole
 * point of the backstop). The hygiene installed by `showDialog` is tracked by
 * id so it can be reclaimed without a live element handle. The id must be
 * non-empty and unique within the document, since it keys this cleanup
 * accounting; a duplicate or empty id would release the wrong dialog's hygiene.
 *
 * Idempotent and exactly-once. It releases only when the dialog currently
 * holds hygiene, then clears the per-dialog marker, so calling it after a
 * normal close, or twice, is a no-op that never under-counts the shared
 * scroll lock. Carries no application close semantics: the Dialog component
 * owns the user-facing close (animation, `Closed` OutMessage, consumer
 * Commands); this only reclaims framework resources.
 *
 * Resolves to `true` when it released resources, `false` when there was
 * nothing to release. Never fails: an id with no held hygiene is a no-op,
 * since the goal is reclaiming resources that may already be gone.
 *
 * @example
 * ```typescript
 * Dom.releaseDialogResources('my-dialog')
 * ```
 */
export const releaseDialogResources = (id: string): Effect.Effect<boolean> =>
  Effect.suspend(() => {
    const released = releaseDialogHygieneById(id)
    if (released) {
      return Effect.as(unlockScroll, true)
    }
    return Effect.succeed(false)
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

const findScrollParent = (element: HTMLElement): Option.Option<HTMLElement> => {
  let candidate = element.parentElement
  while (candidate !== null) {
    const { overflowY } = getComputedStyle(candidate)
    if (overflowY === 'scroll' || overflowY === 'auto') {
      return Option.some(candidate)
    }
    candidate = candidate.parentElement
  }
  return Option.none()
}

/**
 * Like `scrollIntoViewAfterPaint`, but skips the scroll if the element is
 * already fully visible within its scroll container.
 *
 * Defaults to `{ block: 'center' }`; pass a different `block` when the
 * target should land at a specific position when it does need to scroll.
 *
 * `when` selects the timing gate. `'Paint'` (the default) waits for
 * `Render.afterPaint`, so the scroll lands after the target is on screen.
 * `'Commit'` waits for `Render.afterCommit` instead, so the scroll lands in
 * the same frame the DOM patch applies, before the browser paints. Use
 * `'Commit'` when the target is brought into view and scrolled by the same
 * Message (such as a menu opening), so it appears already scrolled rather
 * than visibly jumping.
 *
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Dom.scrollIntoViewIfNotVisible('#active-nav-link')
 * Dom.scrollIntoViewIfNotVisible('#active-nav-link', { block: 'nearest' })
 * Dom.scrollIntoViewIfNotVisible('#active-nav-link', { when: 'Commit' })
 * ```
 */
export const scrollIntoViewIfNotVisible = (
  selector: string,
  options?: Readonly<{
    block?: ScrollLogicalPosition
    when?: 'Paint' | 'Commit'
  }>,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    const when = options?.when ?? 'Paint'
    yield* Match.value(when).pipe(
      Match.when('Paint', () => afterPaint),
      Match.when('Commit', () => afterCommit),
      Match.exhaustive,
    )
    const element = yield* queryHTMLElement(selector)
    Option.match(findScrollParent(element), {
      onNone: () =>
        element.scrollIntoView({ block: options?.block ?? 'center' }),
      onSome: scrollParent => {
        const parentRect = scrollParent.getBoundingClientRect()
        const elementRect = element.getBoundingClientRect()
        const isFullyVisible =
          elementRect.top >= parentRect.top &&
          elementRect.bottom <= parentRect.bottom
        if (!isFullyVisible) {
          element.scrollIntoView({ block: options?.block ?? 'center' })
        }
      },
    })
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

    const focusableElements = focusableElementsWithin(document)

    const referenceElementIndex = Array.findFirstIndex(
      focusableElements,
      Equal.equals(reference),
    )

    if (Option.isNone(referenceElementIndex)) {
      return yield* Effect.fail(new ElementNotFound({ selector }))
    }

    const offsetReferenceElementIndex = Match.value(direction).pipe(
      Match.when('Next', () => Number.increment),
      Match.when('Previous', () => Number.decrement),
      Match.exhaustive,
    )(referenceElementIndex.value)

    const nextElement = Array.get(
      focusableElements,
      offsetReferenceElementIndex,
    )

    if (Option.isSome(nextElement)) {
      nextElement.value.focus()
    }
  })
