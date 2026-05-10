import { Schema as S } from 'effect'

import { ts } from '../schema/index.js'

/** A 2D point in canvas-local coordinates. */
export const Point = S.Struct({ x: S.Number, y: S.Number })
/** A 2D point in canvas-local coordinates. */
export type Point = typeof Point.Type

/** Move the path cursor to a point without drawing. */
export const MoveTo = ts('MoveTo', { x: S.Number, y: S.Number })
/** Move the path cursor to a point without drawing. */
export type MoveTo = typeof MoveTo.Type

/** Draw a straight line from the cursor to a point. */
export const LineTo = ts('LineTo', { x: S.Number, y: S.Number })
/** Draw a straight line from the cursor to a point. */
export type LineTo = typeof LineTo.Type

/** Draw a quadratic Bezier curve from the cursor through a control point to an end point. */
export const QuadTo = ts('QuadTo', {
  cpx: S.Number,
  cpy: S.Number,
  x: S.Number,
  y: S.Number,
})
/** Draw a quadratic Bezier curve from the cursor through a control point to an end point. */
export type QuadTo = typeof QuadTo.Type

/** Draw a cubic Bezier curve from the cursor through two control points to an end point. */
export const BezierTo = ts('BezierTo', {
  cp1x: S.Number,
  cp1y: S.Number,
  cp2x: S.Number,
  cp2y: S.Number,
  x: S.Number,
  y: S.Number,
})
/** Draw a cubic Bezier curve from the cursor through two control points to an end point. */
export type BezierTo = typeof BezierTo.Type

/** Close the current path by drawing a line back to its starting point. */
export const Close = ts('Close')
/** Close the current path by drawing a line back to its starting point. */
export type Close = typeof Close.Type

/** A single drawing instruction within a `Path` shape. */
export const PathInstruction = S.Union([
  MoveTo,
  LineTo,
  QuadTo,
  BezierTo,
  Close,
])
/** A single drawing instruction within a `Path` shape. */
export type PathInstruction = typeof PathInstruction.Type

/** Stroke cap style: how the ends of an open stroked subpath are rendered. */
export const LineCap = S.Literals(['Butt', 'Round', 'Square'])
/** Stroke cap style: how the ends of an open stroked subpath are rendered. */
export type LineCap = typeof LineCap.Type

/** Stroke join style: how two connected stroked segments meet. */
export const LineJoin = S.Literals(['Miter', 'Round', 'Bevel'])
/** Stroke join style: how two connected stroked segments meet. */
export type LineJoin = typeof LineJoin.Type

/** Horizontal alignment of a `Text` shape relative to its anchor x coordinate. */
export const TextAlign = S.Literals(['Left', 'Center', 'Right', 'Start', 'End'])
/** Horizontal alignment of a `Text` shape relative to its anchor x coordinate. */
export type TextAlign = typeof TextAlign.Type

/** Vertical alignment of a `Text` shape relative to its anchor y coordinate. */
export const TextBaseline = S.Literals([
  'Top',
  'Middle',
  'Bottom',
  'Alphabetic',
  'Hanging',
  'Ideographic',
])
/** Vertical alignment of a `Text` shape relative to its anchor y coordinate. */
export type TextBaseline = typeof TextBaseline.Type

/** An axis-aligned rectangle. */
export const Rect = ts('Rect', {
  x: S.Number,
  y: S.Number,
  width: S.Number,
  height: S.Number,
  fill: S.optional(S.String),
  stroke: S.optional(S.String),
  lineWidth: S.optional(S.Number),
})
/** An axis-aligned rectangle. */
export type Rect = typeof Rect.Type

/** A filled or stroked circle. */
export const Circle = ts('Circle', {
  x: S.Number,
  y: S.Number,
  radius: S.Number,
  fill: S.optional(S.String),
  stroke: S.optional(S.String),
  lineWidth: S.optional(S.Number),
})
/** A filled or stroked circle. */
export type Circle = typeof Circle.Type

/** A path built from a sequence of `PathInstruction`s. */
export const Path = ts('Path', {
  instructions: S.Array(PathInstruction),
  fill: S.optional(S.String),
  stroke: S.optional(S.String),
  lineWidth: S.optional(S.Number),
  lineCap: S.optional(LineCap),
  lineJoin: S.optional(LineJoin),
})
/** A path built from a sequence of `PathInstruction`s. */
export type Path = typeof Path.Type

/** A single line of text drawn with a font, fill, and optional stroke. */
export const Text = ts('Text', {
  x: S.Number,
  y: S.Number,
  content: S.String,
  font: S.optional(S.String),
  fill: S.optional(S.String),
  stroke: S.optional(S.String),
  lineWidth: S.optional(S.Number),
  align: S.optional(TextAlign),
  baseline: S.optional(TextBaseline),
})
/** A single line of text drawn with a font, fill, and optional stroke. */
export type Text = typeof Text.Type

/**
 * A scene-graph node that applies a 2D transform and global alpha to a list of
 * child shapes. Transforms compose multiplicatively when groups are nested.
 *
 * Defined via the `interface` form so the recursion (`shapes: ReadonlyArray<Shape>`
 * where `Shape` includes `Group` itself) resolves under TypeScript's lazy
 * interface evaluation. The matching runtime Schema uses `S.suspend`.
 */
export interface Group extends Readonly<{
  readonly _tag: 'Group'
  readonly shapes: ReadonlyArray<Shape>
  readonly translate?: Point | undefined
  readonly rotate?: number | undefined
  readonly scale?: Point | undefined
  readonly opacity?: number | undefined
}> {}

/**
 * A drawable scene-graph node. Composing `Group` recursively builds a tree;
 * the painter walks the tree depth-first, applying transforms via
 * `ctx.save` / `ctx.restore`.
 */
export type Shape =
  | typeof Rect.Type
  | typeof Circle.Type
  | typeof Path.Type
  | typeof Text.Type
  | Group

/**
 * Lazy reference to the full `Shape` union. Used inside `Group`'s `shapes`
 * field so the schema can describe its own children without a forward
 * declaration cycle.
 */
const Shape: S.Schema<Shape> = S.suspend(
  (): S.Schema<Shape> => S.Union([Rect, Circle, Path, Text, Group]),
)

/** Construct a `Group` shape that wraps its children in a transformed scope. */
export const Group = ts('Group', {
  shapes: S.Array(Shape),
  translate: S.optional(Point),
  rotate: S.optional(S.Number),
  scale: S.optional(Point),
  opacity: S.optional(S.Number),
})
