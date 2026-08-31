import { Effect, Queue, Stream } from 'effect'
import { OUTLINE_CUSTOM_EVENT, type OutlineRect } from 'foldkit/outline'

import { OutlineCommand } from './commands.js'
import { SCROLL_THROTTLE_MS } from './constants.js'
import { getDpr } from './geometry.js'

const isOutlineRectBatch = (
  detail: unknown,
): detail is ReadonlyArray<OutlineRect> =>
  Array.isArray(detail) &&
  detail.every(
    item =>
      typeof item === 'object' &&
      item !== null &&
      typeof Reflect.get(item, 'id') === 'string' &&
      typeof Reflect.get(item, 'label') === 'string' &&
      typeof Reflect.get(item, 'x') === 'number' &&
      typeof Reflect.get(item, 'y') === 'number' &&
      typeof Reflect.get(item, 'width') === 'number' &&
      typeof Reflect.get(item, 'height') === 'number',
  )

export const outlineBatchStream = Stream.callback<ReadonlyArray<OutlineRect>>(
  queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const onOutline = (event: Event): void => {
          if (!(event instanceof CustomEvent)) {
            return
          }
          const detail = event.detail
          if (!isOutlineRectBatch(detail) || detail.length === 0) {
            return
          }
          Queue.offerUnsafe(queue, detail)
        }
        window.addEventListener(OUTLINE_CUSTOM_EVENT, onOutline)
        return onOutline
      }),
      onOutline =>
        Effect.sync(() =>
          window.removeEventListener(OUTLINE_CUSTOM_EVENT, onOutline),
        ),
    ).pipe(Effect.flatMap(() => Effect.never)),
)

type ScrollIngressState = {
  prevScrollX: number
  prevScrollY: number
  elementScrollPos: WeakMap<Element, { x: number; y: number }>
  pendingScrollTarget: EventTarget | null
  timeoutId: ReturnType<typeof setTimeout> | undefined
}

export const acquireScrollIngress = (
  onCommands: (commands: ReadonlyArray<OutlineCommand>) => void,
) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const state: ScrollIngressState = {
        prevScrollX: window.scrollX,
        prevScrollY: window.scrollY,
        elementScrollPos: new WeakMap(),
        pendingScrollTarget: null,
        timeoutId: undefined,
      }

      const flushScroll = (): void => {
        state.timeoutId = undefined
        const target = state.pendingScrollTarget
        state.pendingScrollTarget = null

        const deltaX = window.scrollX - state.prevScrollX
        const deltaY = window.scrollY - state.prevScrollY
        state.prevScrollX = window.scrollX
        state.prevScrollY = window.scrollY

        let nestedDeltaX = 0
        let nestedDeltaY = 0
        let hasNestedScroll = false
        if (target instanceof Element) {
          const currentX = target.scrollLeft
          const currentY = target.scrollTop
          const prev = state.elementScrollPos.get(target)
          if (prev) {
            nestedDeltaX = currentX - prev.x
            nestedDeltaY = currentY - prev.y
          }
          state.elementScrollPos.set(target, {
            x: currentX,
            y: currentY,
          })
          hasNestedScroll = nestedDeltaX !== 0 || nestedDeltaY !== 0
        }

        const commands: Array<OutlineCommand> = []
        if (deltaX !== 0 || deltaY !== 0) {
          commands.push(OutlineCommand.Scroll({ deltaX, deltaY }))
        }
        if (hasNestedScroll) {
          commands.push(
            OutlineCommand.Scroll({
              deltaX: nestedDeltaX,
              deltaY: nestedDeltaY,
            }),
          )
        }
        if (hasNestedScroll && deltaX === 0 && deltaY === 0) {
          commands.push(OutlineCommand.Scroll({ deltaX: 0, deltaY: 0 }))
        }

        if (commands.length > 0) {
          onCommands(commands)
        }
      }

      const scheduleFlush = (): void => {
        if (state.timeoutId !== undefined) {
          return
        }
        state.timeoutId = setTimeout(() => flushScroll(), SCROLL_THROTTLE_MS)
      }

      const onScroll = (event: Event): void => {
        if (event.target) {
          state.pendingScrollTarget = event.target
        }
        scheduleFlush()
      }

      window.addEventListener('scroll', onScroll, { passive: true })
      document.addEventListener('scroll', onScroll, {
        passive: true,
        capture: true,
      })

      return { onScroll, state }
    }),
    ({ onScroll, state }) =>
      Effect.sync(() => {
        if (state.timeoutId !== undefined) {
          clearTimeout(state.timeoutId)
        }
        window.removeEventListener('scroll', onScroll)
        document.removeEventListener('scroll', onScroll, { capture: true })
      }),
  )

export const resizeCommandStream = Stream.callback<OutlineCommand>(queue =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const onResize = (): void => {
        Queue.offerUnsafe(
          queue,
          OutlineCommand.Resize({
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: getDpr(),
          }),
        )
      }
      window.addEventListener('resize', onResize)
      return onResize
    }),
    onResize =>
      Effect.sync(() => window.removeEventListener('resize', onResize)),
  ).pipe(Effect.flatMap(() => Effect.never)),
)
