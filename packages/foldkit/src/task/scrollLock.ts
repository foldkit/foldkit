import { Effect, Number } from 'effect'

const scrollLockState = {
  count: 0,
  overflow: '',
  paddingRight: '',
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
 * Compensates for scrollbar width with padding to prevent layout shift.
 * On iOS Safari, intercepts `touchmove` events to prevent page scroll
 * while allowing scrolling within overflow containers.
 * Uses reference counting so nested locks are safe — the page only unlocks
 * when every lock has been released.
 *
 * @example
 * ```typescript
 * Task.lockScroll.pipe(Effect.as(NoOp()))
 * ```
 */
export const lockScroll: Effect.Effect<void> = Effect.sync(() => {
  const {
    documentElement,
    documentElement: { style },
  } = document

  if (scrollLockState.count === 0) {
    scrollLockState.overflow = style.overflow
    scrollLockState.paddingRight = style.paddingRight

    const scrollbarWidth = window.innerWidth - documentElement.clientWidth

    style.overflow = 'hidden'
    style.paddingRight =
      scrollbarWidth > 0 ? `${scrollbarWidth}px` : style.paddingRight

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
 * original `overflow` and `padding-right` on the document element.
 * On iOS Safari, removes the `touchmove` listener.
 *
 * @example
 * ```typescript
 * Task.unlockScroll.pipe(Effect.as(NoOp()))
 * ```
 */
export const unlockScroll: Effect.Effect<void> = Effect.sync(() => {
  scrollLockState.count = Math.max(0, Number.decrement(scrollLockState.count))

  if (scrollLockState.count === 0) {
    const {
      documentElement: { style },
    } = document
    style.overflow = scrollLockState.overflow
    style.paddingRight = scrollLockState.paddingRight
    document.removeEventListener('touchmove', handleTouchMove)
  }
})
