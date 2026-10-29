import { Effect, Number } from 'effect'

const scrollLockState = {
  count: 0,
  overflow: '',
  scrollbarGutter: '',
}

const isIOS = (): boolean => {
  const { platform, maxTouchPoints } = window.navigator
  const isIPhone = /iPhone/gi.test(platform)
  const isIPad = /Mac/gi.test(platform) && maxTouchPoints > 0
  return isIPhone || isIPad
}

const isScrollableElement = (element: Element): boolean => {
  const style = window.getComputedStyle(element)
  const overflowY = style.overflowY
  const isOverflowable = overflowY === 'auto' || overflowY === 'scroll'
  return isOverflowable && element.scrollHeight > element.clientHeight
}

const findScrollableParent = (target: Element): Element | null => {
  let current: Element | null = target
  while (current && current !== document.documentElement) {
    if (isScrollableElement(current)) {
      return current
    }
    current = current.parentElement
  }
  return null
}

const touchTarget = (event: TouchEvent): Element | null => {
  const composed = event.composedPath()[0]
  return composed instanceof Element ? composed : null
}

const handleTouchMove = (event: TouchEvent): void => {
  const target = touchTarget(event)
  if (target && !findScrollableParent(target)) {
    event.preventDefault()
  }
}

/**
 * Locks page scroll by setting `overflow: hidden` on the document element.
 * When the page's scrollbar takes up width, a stable `scrollbar-gutter` keeps
 * that width reserved while the scrollbar is hidden, so neither the page nor
 * fixed-position elements shift. A root that already has a stable gutter, or
 * an overlay scrollbar that takes no width, is left as it is.
 * On iOS Safari, intercepts `touchmove` events to prevent page scroll
 * while allowing scrolling within overflow containers.
 * Uses reference counting so nested locks are safe. The page only unlocks
 * when every lock has been released.
 *
 * @example
 * ```typescript
 * Dom.lockScroll
 * ```
 */
export const lockScroll: Effect.Effect<void> = Effect.sync(() => {
  const {
    documentElement,
    documentElement: { style },
  } = document

  if (scrollLockState.count === 0) {
    scrollLockState.overflow = style.overflow
    scrollLockState.scrollbarGutter = style.scrollbarGutter

    const isGutterAlreadyStable = window
      .getComputedStyle(documentElement)
      .scrollbarGutter.startsWith('stable')
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth

    style.overflow = 'hidden'

    if (!isGutterAlreadyStable && scrollbarWidth > 0) {
      style.scrollbarGutter = 'stable'
    }

    if (isIOS()) {
      document.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      })
    }
  }

  scrollLockState.count++
})

/**
 * Releases one scroll lock. When the last lock is released, restores the
 * original `overflow` and `scrollbar-gutter` on the document element.
 * On iOS Safari, removes the `touchmove` listener.
 *
 * @example
 * ```typescript
 * Dom.unlockScroll
 * ```
 */
export const unlockScroll: Effect.Effect<void> = Effect.sync(() => {
  scrollLockState.count = Math.max(0, Number.decrement(scrollLockState.count))

  if (scrollLockState.count === 0) {
    const {
      documentElement: { style },
    } = document
    style.overflow = scrollLockState.overflow
    style.scrollbarGutter = scrollLockState.scrollbarGutter
    document.removeEventListener('touchmove', handleTouchMove)
  }
})
