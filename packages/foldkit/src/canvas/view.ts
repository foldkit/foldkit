import { Array, Predicate, Record, String, pipe } from 'effect'

import {
  type Html,
  type HtmlBuilder,
  __requireDispatch,
} from '../html/index.js'
import { h } from '../snabbdom/index.js'
import type { Classes, On, VNodeData } from '../snabbdom/index.js'
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

type PaintedCanvas = Readonly<{
  context: CanvasRenderingContext2D
  width: number
  height: number
  shapes: ReadonlyArray<Shape>
  repaint: () => void
}>

/**
 * Per-element paint state. Keyed by the live `<canvas>` element so the
 * postpatch hook reads the same context the insert hook captured, and so an
 * `Image` that finishes loading repaints the scene the canvas last rendered.
 * `WeakMap` lets the entry be reclaimed if the element is removed.
 */
const paintedCanvasStore = new WeakMap<HTMLCanvasElement, PaintedCanvas>()

const paintCanvas = ({
  context,
  width,
  height,
  shapes,
  repaint,
}: PaintedCanvas): void => paintScene(context, width, height, shapes, repaint)

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
 * `shapes` and of which `Image` sources have loaded. Same shapes produce the
 * same pixels once their images have loaded, and a canvas repaints its current
 * scene when an image it drew finishes loading.
 *
 * The trailing `h` fixes `Message` to the calling view's frame; the pointer
 * handlers dispatch through that frame at fire time, so passing the builder
 * that built the surrounding view is what makes the handler types truthful.
 *
 * @example
 * ```typescript
 * Canvas.view(
 *   {
 *     width: 400,
 *     height: 300,
 *     shapes: [
 *       Canvas.Rect({ x: 0, y: 0, width: 400, height: 300, fill: '#000' }),
 *       Canvas.Circle({ x: 200, y: 150, radius: 50, fill: '#f0a' }),
 *     ],
 *     onPointerDown: ({ x, y }) => ClickedCanvas({ x, y }),
 *   },
 *   h,
 * )
 * ```
 */
export const view = <Message>(
  config: ViewConfig<NoInfer<Message>>,
  _h: HtmlBuilder<Message>,
): Html => {
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
        const context = canvas.getContext('2d')
        if (Predicate.isNull(context)) {
          return
        }

        const repaint = (): void => {
          const latestPaint = paintedCanvasStore.get(canvas)
          if (latestPaint !== undefined) {
            paintCanvas(latestPaint)
          }
        }

        const paintedCanvas = { context, width, height, shapes, repaint }
        paintedCanvasStore.set(canvas, paintedCanvas)
        paintCanvas(paintedCanvas)
      },
      postpatch: (_oldVnode, vnode) => {
        if (!(vnode.elm instanceof HTMLCanvasElement)) {
          return
        }
        const previousPaint = paintedCanvasStore.get(vnode.elm)
        if (previousPaint === undefined) {
          return
        }

        const paintedCanvas = { ...previousPaint, width, height, shapes }
        paintedCanvasStore.set(vnode.elm, paintedCanvas)
        paintCanvas(paintedCanvas)
      },
      destroy: vnode => {
        if (vnode.elm instanceof HTMLCanvasElement) {
          paintedCanvasStore.delete(vnode.elm)
        }
      },
    },
  }

  return h('canvas', data)
}
