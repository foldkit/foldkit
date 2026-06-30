import { Match as M, Schema as S } from 'effect'

import type { Html } from '../../html/index.js'
import { html } from '../../html/index.js'
import { m } from '../../message/index.js'

// MODEL

export const Model = S.Struct({})
export type Model = typeof Model.Type

// MESSAGE

export const IgnoredInteraction = m('IgnoredInteraction')

export const Message = S.Union([IgnoredInteraction])
export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {}

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      IgnoredInteraction: () => [model, []],
    }),
  )

// VIEW

export const view = (_model: Model): Html => {
  const h = html<Message>()

  return h.svg(
    [
      h.DataAttribute('testid', 'svg-root'),
      h.ViewBox('0 0 100 100'),
      h.PreserveAspectRatio('xMidYMid meet'),
      h.Color('black'),
      h.Overflow('visible'),
    ],
    [
      h.text(
        [
          h.DataAttribute('testid', 'svg-text'),
          h.Dx('1'),
          h.Dy('2'),
          h.Rotate('15'),
          h.TextAnchor('middle'),
          h.DominantBaseline('central'),
          h.AlignmentBaseline('middle'),
          h.BaselineShift('super'),
          h.TextLength('40'),
          h.LengthAdjust('spacing'),
          h.FontFamily('serif'),
          h.FontSize('12'),
          h.FontWeight('bold'),
          h.FontStyle('italic'),
          h.LetterSpacing('1'),
          h.WordSpacing('2'),
          h.TextDecoration('underline'),
          h.WritingMode('horizontal-tb'),
          h.Visibility('visible'),
          h.Display('inline'),
          h.Cursor('pointer'),
          h.PointerEvents('none'),
        ],
        ['Label'],
      ),
      h.rect(
        [
          h.DataAttribute('testid', 'svg-rect'),
          h.Rx('4'),
          h.Ry('4'),
          h.PathLength('100'),
          h.FillOpacity('0.5'),
          h.StrokeOpacity('0.8'),
          h.StrokeMiterlimit('2'),
          h.PaintOrder('stroke'),
          h.VectorEffect('non-scaling-stroke'),
          h.ShapeRendering('crispEdges'),
          h.TextRendering('optimizeLegibility'),
          h.ImageRendering('pixelated'),
          h.ClipPath('url(#clip)'),
          h.Mask('url(#mask)'),
          h.Filter('url(#filter)'),
          h.MarkerStart('url(#start)'),
          h.MarkerMid('url(#mid)'),
          h.MarkerEnd('url(#end)'),
        ],
        [],
      ),
      h.linearGradient(
        [
          h.DataAttribute('testid', 'svg-gradient'),
          h.GradientUnits('userSpaceOnUse'),
          h.GradientTransform('rotate(45)'),
          h.SpreadMethod('reflect'),
          h.Fx('0.1'),
          h.Fy('0.2'),
          h.Fr('0.3'),
          h.ClipPathUnits('userSpaceOnUse'),
          h.MaskUnits('userSpaceOnUse'),
          h.MaskContentUnits('userSpaceOnUse'),
          h.FilterUnits('userSpaceOnUse'),
          h.PrimitiveUnits('userSpaceOnUse'),
        ],
        [
          h.stop(
            [
              h.DataAttribute('testid', 'svg-stop'),
              h.Offset('0.5'),
              h.StopColor('red'),
              h.StopOpacity('0.9'),
            ],
            [],
          ),
        ],
      ),
      h.pattern(
        [
          h.DataAttribute('testid', 'svg-pattern'),
          h.PatternUnits('userSpaceOnUse'),
          h.PatternContentUnits('userSpaceOnUse'),
          h.PatternTransform('scale(2)'),
        ],
        [],
      ),
      h.marker(
        [
          h.DataAttribute('testid', 'svg-marker'),
          h.MarkerWidth('6'),
          h.MarkerHeight('6'),
          h.MarkerUnits('strokeWidth'),
          h.RefX('3'),
          h.RefY('3'),
          h.Orient('auto'),
        ],
        [],
      ),
    ],
  )
}
