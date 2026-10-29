import { Schema } from 'effect'

import { taggedStruct } from '../schema/index.js'

/** A 2D point in canvas-local coordinates. */
export const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number })
/** A 2D point in canvas-local coordinates. */
export type Point = typeof Point.Type

/** Move the path cursor to a point without drawing. */
export const MoveTo = taggedStruct('MoveTo', {
  x: Schema.Number,
  y: Schema.Number,
})
/** Move the path cursor to a point without drawing. */
export type MoveTo = typeof MoveTo.Type

/** Draw a straight line from the cursor to a point. */
export const LineTo = taggedStruct('LineTo', {
  x: Schema.Number,
  y: Schema.Number,
})
/** Draw a straight line from the cursor to a point. */
export type LineTo = typeof LineTo.Type

/** Draw a quadratic Bezier curve from the cursor through a control point to an end point. */
export const QuadTo = taggedStruct('QuadTo', {
  cpx: Schema.Number,
  cpy: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
})
/** Draw a quadratic Bezier curve from the cursor through a control point to an end point. */
export type QuadTo = typeof QuadTo.Type

/** Draw a cubic Bezier curve from the cursor through two control points to an end point. */
export const BezierTo = taggedStruct('BezierTo', {
  cp1x: Schema.Number,
  cp1y: Schema.Number,
  cp2x: Schema.Number,
  cp2y: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
})
/** Draw a cubic Bezier curve from the cursor through two control points to an end point. */
export type BezierTo = typeof BezierTo.Type

/** Close the current path by drawing a line back to its starting point. */
export const Close = taggedStruct('Close')
/** Close the current path by drawing a line back to its starting point. */
export type Close = typeof Close.Type

/** A single drawing instruction within a `Path` shape. */
export const PathInstruction = Schema.Union([
  MoveTo,
  LineTo,
  QuadTo,
  BezierTo,
  Close,
])
/** A single drawing instruction within a `Path` shape. */
export type PathInstruction = typeof PathInstruction.Type

/** Stroke cap style: how the ends of an open stroked subpath are rendered. */
export const LineCap = Schema.Literals(['Butt', 'Round', 'Square'])
/** Stroke cap style: how the ends of an open stroked subpath are rendered. */
export type LineCap = typeof LineCap.Type

/** Stroke join style: how two connected stroked segments meet. */
export const LineJoin = Schema.Literals(['Miter', 'Round', 'Bevel'])
/** Stroke join style: how two connected stroked segments meet. */
export type LineJoin = typeof LineJoin.Type

/** Horizontal alignment of a `Text` shape relative to its anchor x coordinate. */
export const TextAlign = Schema.Literals([
  'Left',
  'Center',
  'Right',
  'Start',
  'End',
])
/** Horizontal alignment of a `Text` shape relative to its anchor x coordinate. */
export type TextAlign = typeof TextAlign.Type

/** Vertical alignment of a `Text` shape relative to its anchor y coordinate. */
export const TextBaseline = Schema.Literals([
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
export const Rect = taggedStruct('Rect', {
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
  fill: Schema.optional(Schema.String),
  stroke: Schema.optional(Schema.String),
  lineWidth: Schema.optional(Schema.Number),
})
/** An axis-aligned rectangle. */
export type Rect = typeof Rect.Type

/** A filled or stroked circle. */
export const Circle = taggedStruct('Circle', {
  x: Schema.Number,
  y: Schema.Number,
  radius: Schema.Number,
  fill: Schema.optional(Schema.String),
  stroke: Schema.optional(Schema.String),
  lineWidth: Schema.optional(Schema.Number),
})
/** A filled or stroked circle. */
export type Circle = typeof Circle.Type

/** A path built from a sequence of `PathInstruction`s. */
export const Path = taggedStruct('Path', {
  instructions: Schema.Array(PathInstruction),
  fill: Schema.optional(Schema.String),
  stroke: Schema.optional(Schema.String),
  lineWidth: Schema.optional(Schema.Number),
  lineCap: Schema.optional(LineCap),
  lineJoin: Schema.optional(LineJoin),
})
/** A path built from a sequence of `PathInstruction`s. */
export type Path = typeof Path.Type

/** A single line of text drawn with a font, fill, and optional stroke. */
export const Text = taggedStruct('Text', {
  x: Schema.Number,
  y: Schema.Number,
  content: Schema.String,
  font: Schema.optional(Schema.String),
  fill: Schema.optional(Schema.String),
  stroke: Schema.optional(Schema.String),
  lineWidth: Schema.optional(Schema.Number),
  align: Schema.optional(TextAlign),
  baseline: Schema.optional(TextBaseline),
})
/** A single line of text drawn with a font, fill, and optional stroke. */
export type Text = typeof Text.Type

/**
 * The region of an `Image` shape's source to draw, in the source image's own
 * pixels. Use it to draw one frame of a sprite sheet.
 */
export const ImageCrop = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
})
/**
 * The region of an `Image` shape's source to draw, in the source image's own
 * pixels. Use it to draw one frame of a sprite sheet.
 */
export type ImageCrop = typeof ImageCrop.Type

/**
 * How an `Image` shape samples its source when drawn at a different size.
 * `Smooth` interpolates between source pixels, the canvas default.
 * `Pixelated` keeps hard pixel edges, for scaling up pixel art.
 */
export const ImageRendering = Schema.Literals(['Smooth', 'Pixelated'])
/**
 * How an `Image` shape samples its source when drawn at a different size.
 * `Smooth` interpolates between source pixels, the canvas default.
 * `Pixelated` keeps hard pixel edges, for scaling up pixel art.
 */
export type ImageRendering = typeof ImageRendering.Type

/**
 * A bitmap drawn from a URL into a `width` by `height` box at `x`, `y`.
 * `src` accepts anything an `<img>` element does, including data URLs.
 * `crop` draws one region of the source, such as a frame of a sprite sheet.
 *
 * The painter loads each `src` once and keeps the decoded image for the life
 * of the page. Until it has loaded, the shape draws nothing; when it loads,
 * every canvas that drew it repaints its latest scene. A `src` that
 * fails to load draws nothing.
 */
export const Image = taggedStruct('Image', {
  src: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
  crop: Schema.optional(ImageCrop),
  rendering: Schema.optional(ImageRendering),
})
/**
 * A bitmap drawn from a URL into a `width` by `height` box at `x`, `y`.
 * `src` accepts anything an `<img>` element does, including data URLs.
 * `crop` draws one region of the source, such as a frame of a sprite sheet.
 *
 * The painter loads each `src` once and keeps the decoded image for the life
 * of the page. Until it has loaded, the shape draws nothing; when it loads,
 * every canvas that drew it repaints its latest scene. A `src` that
 * fails to load draws nothing.
 */
export type Image = typeof Image.Type

/**
 * A scene-graph node that applies a 2D transform and global alpha to a list of
 * child shapes. Transforms compose multiplicatively when groups are nested.
 *
 * Defined via the `interface` form so the recursion (`shapes: ReadonlyArray<Shape>`
 * where `Shape` includes `Group` itself) resolves under TypeScript's lazy
 * interface evaluation. The matching runtime Schema uses `Schema.suspend`.
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
  | typeof Image.Type
  | Group

/**
 * Lazy reference to the full `Shape` union. Used inside `Group`'s `shapes`
 * field so the schema can describe its own children without a forward
 * declaration cycle.
 */
const Shape: Schema.Schema<Shape> = Schema.suspend((): Schema.Schema<Shape> =>
  Schema.Union([Rect, Circle, Path, Text, Image, Group]),
)

/** Construct a `Group` shape that wraps its children in a transformed scope. */
export const Group = taggedStruct('Group', {
  shapes: Schema.Array(Shape),
  translate: Schema.optional(Point),
  rotate: Schema.optional(Schema.Number),
  scale: Schema.optional(Point),
  opacity: Schema.optional(Schema.Number),
})
