import { Array, Match } from 'effect'

import type {
  Circle,
  Group,
  LineCap,
  LineJoin,
  Path,
  PathInstruction,
  Rect,
  Shape,
  Text,
  TextAlign,
  TextBaseline,
} from './shape.js'

const lineCapForCanvas: Readonly<Record<LineCap, CanvasLineCap>> = {
  Butt: 'butt',
  Round: 'round',
  Square: 'square',
}

const lineJoinForCanvas: Readonly<Record<LineJoin, CanvasLineJoin>> = {
  Miter: 'miter',
  Round: 'round',
  Bevel: 'bevel',
}

const textAlignForCanvas: Readonly<Record<TextAlign, CanvasTextAlign>> = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
  Start: 'start',
  End: 'end',
}

const textBaselineForCanvas: Readonly<
  Record<TextBaseline, CanvasTextBaseline>
> = {
  Top: 'top',
  Middle: 'middle',
  Bottom: 'bottom',
  Alphabetic: 'alphabetic',
  Hanging: 'hanging',
  Ideographic: 'ideographic',
}

const paintRect =
  (ctx: CanvasRenderingContext2D) =>
  (rect: Rect): void => {
    if (rect.fill !== undefined) {
      ctx.fillStyle = rect.fill
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
    if (rect.stroke !== undefined) {
      ctx.strokeStyle = rect.stroke
      if (rect.lineWidth !== undefined) {
        ctx.lineWidth = rect.lineWidth
      }
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    }
  }

const paintCircle =
  (ctx: CanvasRenderingContext2D) =>
  (circle: Circle): void => {
    ctx.beginPath()
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2)
    if (circle.fill !== undefined) {
      ctx.fillStyle = circle.fill
      ctx.fill()
    }
    if (circle.stroke !== undefined) {
      ctx.strokeStyle = circle.stroke
      if (circle.lineWidth !== undefined) {
        ctx.lineWidth = circle.lineWidth
      }
      ctx.stroke()
    }
  }

const applyPathInstruction =
  (ctx: CanvasRenderingContext2D) =>
  (instruction: PathInstruction): void =>
    Match.value(instruction).pipe(
      Match.tagsExhaustive({
        MoveTo: ({ x, y }) => ctx.moveTo(x, y),
        LineTo: ({ x, y }) => ctx.lineTo(x, y),
        QuadTo: ({ cpx, cpy, x, y }) => ctx.quadraticCurveTo(cpx, cpy, x, y),
        BezierTo: ({ cp1x, cp1y, cp2x, cp2y, x, y }) =>
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y),
        Close: () => ctx.closePath(),
      }),
    )

const paintPath =
  (ctx: CanvasRenderingContext2D) =>
  (path: Path): void => {
    ctx.beginPath()
    Array.forEach(path.instructions, applyPathInstruction(ctx))
    if (path.fill !== undefined) {
      ctx.fillStyle = path.fill
      ctx.fill()
    }
    if (path.stroke !== undefined) {
      ctx.strokeStyle = path.stroke
      if (path.lineWidth !== undefined) {
        ctx.lineWidth = path.lineWidth
      }
      if (path.lineCap !== undefined) {
        ctx.lineCap = lineCapForCanvas[path.lineCap]
      }
      if (path.lineJoin !== undefined) {
        ctx.lineJoin = lineJoinForCanvas[path.lineJoin]
      }
      ctx.stroke()
    }
  }

const paintText =
  (ctx: CanvasRenderingContext2D) =>
  (text: Text): void => {
    if (text.font !== undefined) {
      ctx.font = text.font
    }
    if (text.align !== undefined) {
      ctx.textAlign = textAlignForCanvas[text.align]
    }
    if (text.baseline !== undefined) {
      ctx.textBaseline = textBaselineForCanvas[text.baseline]
    }
    if (text.fill !== undefined) {
      ctx.fillStyle = text.fill
      ctx.fillText(text.content, text.x, text.y)
    }
    if (text.stroke !== undefined) {
      ctx.strokeStyle = text.stroke
      if (text.lineWidth !== undefined) {
        ctx.lineWidth = text.lineWidth
      }
      ctx.strokeText(text.content, text.x, text.y)
    }
  }

const paintGroup =
  (ctx: CanvasRenderingContext2D) =>
  (group: Group): void => {
    if (group.opacity !== undefined) {
      ctx.globalAlpha *= group.opacity
    }
    if (group.translate !== undefined) {
      ctx.translate(group.translate.x, group.translate.y)
    }
    if (group.rotate !== undefined) {
      ctx.rotate(group.rotate)
    }
    if (group.scale !== undefined) {
      ctx.scale(group.scale.x, group.scale.y)
    }
    Array.forEach(group.shapes, paintShape(ctx))
  }

/**
 * Paint a single `Shape` to the 2D context. Each call is bracketed by
 * `ctx.save` / `ctx.restore` so per-shape state mutations (fillStyle,
 * lineWidth, font, transforms applied by `Group`, etc.) cannot leak to
 * sibling shapes. Recurses into `Group` children inside the saved scope.
 */
export const paintShape =
  (ctx: CanvasRenderingContext2D) =>
  (shape: Shape): void => {
    ctx.save()
    Match.value(shape).pipe(
      Match.tagsExhaustive({
        Rect: paintRect(ctx),
        Circle: paintCircle(ctx),
        Path: paintPath(ctx),
        Text: paintText(ctx),
        Group: paintGroup(ctx),
      }),
    )
    ctx.restore()
  }

/**
 * Clear the canvas and paint every shape in `shapes` against the given
 * 2D context. Called by `Canvas.view` on insert and on every postpatch.
 */
export const paintScene = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shapes: ReadonlyArray<Shape>,
): void => {
  ctx.clearRect(0, 0, width, height)
  Array.forEach(shapes, paintShape(ctx))
}
