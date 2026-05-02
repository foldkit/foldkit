import { Effect } from 'effect'

const rectToPosition = (rect: DOMRect): string => `${rect.x},${rect.y}`

/**
 * Detects if the element matching the given selector moves in the viewport.
 * Snapshots the element's position via `getBoundingClientRect` and watches for
 * changes using a `ResizeObserver` plus window `scroll` and `resize` listeners.
 * Resolves when movement is detected. Falls back to completing immediately if
 * the element is missing.
 *
 * Cleanup runs automatically when the fiber is interrupted (e.g. by
 * `Effect.raceFirst`), removing the observer and event listeners via
 * `AbortSignal`.
 *
 * @example
 * ```typescript
 * Task.detectElementMovement('#menu-button').pipe(
 *   Effect.as(DetectedButtonMovement()),
 * )
 * ```
 */
export const detectElementMovement = (selector: string): Effect.Effect<void> =>
  Effect.callback<void>((resume, signal) => {
    requestAnimationFrame(() => {
      if (signal.aborted) {
        return
      }

      const element = document.querySelector(selector)

      if (!(element instanceof HTMLElement)) {
        return resume(Effect.void)
      }

      const initialPosition = rectToPosition(element.getBoundingClientRect())

      const cleanup = () => {
        observer.disconnect()
        window.removeEventListener('scroll', check, { capture: true })
        window.removeEventListener('resize', check)
      }

      const check = () => {
        if (
          rectToPosition(element.getBoundingClientRect()) !== initialPosition
        ) {
          cleanup()
          resume(Effect.void)
        }
      }

      const observer = new ResizeObserver(check)
      observer.observe(element)
      window.addEventListener('scroll', check, { passive: true, capture: true })
      window.addEventListener('resize', check)

      signal.addEventListener('abort', cleanup)
    })
  })
