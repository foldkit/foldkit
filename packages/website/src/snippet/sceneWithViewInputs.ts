import { inertHtml as ih } from 'foldkit/html'
import { expect, given, role, scene, withViewInputs } from 'foldkit/scene'

import { Slider } from '@foldkit/ui'

const model = Slider.init({ id: 'volume', min: 0, max: 10, step: 1 })

// Defaults supply the full ViewInputs once. The returned factory produces
// a (model, h) view for scene, taking per-test overrides for
// everything except toView.
const sceneView = withViewInputs(Slider.view, {
  value: 5,
  toView: attributes =>
    ih.div(
      [...attributes.root],
      [ih.div([...attributes.track]), ih.div([...attributes.thumb])],
    ),
})

// Vary value inputs per test while the renderer stays pinned.
scene(
  { update: Slider.update, view: sceneView() },
  given(model),
  expect(role('slider')).toHaveAttr('aria-valuenow', '5'),
)

scene(
  { update: Slider.update, view: sceneView({ isDisabled: true }) },
  given(model),
  expect(role('slider')).toHaveAttr('aria-disabled', 'true'),
)
