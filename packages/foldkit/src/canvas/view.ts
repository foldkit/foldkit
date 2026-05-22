import { Array, Predicate, Record, String, pipe } from 'effect'
import { h } from 'snabbdom'
import type { Classes, On, VNodeData } from 'snabbdom'

import { type Html, __requireDispatch } from '../html/index.js'
import { paintScene } from './paint.js'
import type { Point, Shape } from './shape.js'

/**
 * Configuration for `Canvas.view`. Pointer handlers are optional and
 * receive a `Point` already translated to the canvas's internal coordinate
 * space (the `width` and `height` passed here), independent of how the
 * canvas is sized in CSS.
 */
export type ViewConfig<Message> = Readonly<{
  width: number
  height: number
  shapes: ReadonlyArray<Shape>
  className?: string | undefined
  onPointerDown?: ((point: Point) => Message) | undefined
  onPointerMove?: ((point: Point) => Message) | undefined
  onPointerUp?: ((point: Point) => Message) | undefined
}>

/**
 * Per-element 2D context cache. Keyed by the live `<canvas>` element so the
 * postpatch hook reads the same context the insert hook captured. `WeakMap`
 * lets the entry be reclaimed if the element is removed.
 */
const contextStore = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>()

const toCanvasPoint = (
  canvas: HTMLCanvasElement,
  event: PointerEvent,
): Point => {
  const rect = canvas.getBoundingClientRect()
  const scaleX = rect.width === 0 ? 1 : canvas.width / rect.width
  const scaleY = rect.height === 0 ? 1 : canvas.height / rect.height
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  }
}

const classesFromClassName = (className: string): Classes =>
  pipe(
    className,
    String.split(/\s+/),
    Array.filter(String.isNonEmpty),
    Record.fromIterableWith(name => [name, true] as const),
  )

/**
 * A virtual DOM `<canvas>` element backed by a declarative scene description.
 * The insert hook captures the 2D context and paints the initial scene; the
 * postpatch hook re-paints on every render. The canvas is a pure function of
 * `shapes`. Same shapes produce the same pixels.
 *
 * @example
 * ```typescript
 * Canvas.view<Message>({
 *   width: 400,
 *   height: 300,
 *   shapes: [
 *     Canvas.Rect({ x: 0, y: 0, width: 400, height: 300, fill: '#000' }),
 *     Canvas.Circle({ x: 200, y: 150, radius: 50, fill: '#f0a' }),
 *   ],
 *   onPointerDown: ({ x, y }) => ClickedCanvas({ x, y }),
 * })
 * ```
 */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const dispatchSync = __requireDispatch()

  const {
    width,
    height,
    shapes,
    className,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = config

  const pointerListener =
    (toMessage: (point: Point) => Message) =>
    (event: PointerEvent): void => {
      const target = event.currentTarget
      if (target instanceof HTMLCanvasElement) {
        dispatchSync(toMessage(toCanvasPoint(target, event)))
      }
    }

  const listeners: On = {
    ...(onPointerDown !== undefined && {
      pointerdown: pointerListener(onPointerDown),
    }),
    ...(onPointerMove !== undefined && {
      pointermove: pointerListener(onPointerMove),
    }),
    ...(onPointerUp !== undefined && {
      pointerup: pointerListener(onPointerUp),
    }),
  }

  const data: VNodeData = {
    props: { width, height },
    on: listeners,
    ...(className !== undefined && {
      class: classesFromClassName(className),
    }),
    hook: {
      insert: vnode => {
        if (!(vnode.elm instanceof HTMLCanvasElement)) {
          return
        }
        const canvas = vnode.elm
        const nullableContext = canvas.getContext('2d')
        if (Predicate.isNull(nullableContext)) {
          return
        }
        contextStore.set(canvas, nullableContext)
        paintScene(nullableContext, width, height, shapes)
      },
      postpatch: (_oldVnode, vnode) => {
        if (!(vnode.elm instanceof HTMLCanvasElement)) {
          return
        }
        const nullableContext = contextStore.get(vnode.elm)
        if (nullableContext === undefined) {
          return
        }
        paintScene(nullableContext, width, height, shapes)
      },
      destroy: vnode => {
        if (vnode.elm instanceof HTMLCanvasElement) {
          contextStore.delete(vnode.elm)
        }
      },
    },
  }

  return h('canvas', data)
}
