import { Css } from 'foldkit'
import { expect, given, scene, selector } from 'foldkit/scene'

const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.li([
    h.Id(`row-${model.index}`),
    h.Style({ animationDelay: Css.s(0.3 + model.index * 0.08) }),
  ])

scene(
  { update, view },
  given(modelWithRowAt(2)),
  expect(selector('#row-2')).toHaveStyle('animation-delay', '0.46s'),
  expect(selector('#row-2')).toHaveStyle(
    'animation-delay',
    Css.s(0.3 + 2 * 0.08),
  ),
)
