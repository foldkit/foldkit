import { Schema } from 'effect'
import { Block } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { expect, given, role, scene, withViewInputs } from 'foldkit/scene'

import { Slider } from '@foldkit/ui'

const Model = Schema.Struct({ slider: Slider.SliderBlock.Model })
const Message = defineMessageUnion({})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const SliderBinding = ApplicationDefinition.makeBinding(Slider.SliderBlock, {
  field: 'slider',
  init: {
    contextToArgs: () => [{ id: 'volume', min: 0, max: 10, step: 1 }],
  },
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(Slider.SliderBlock, {
    ChangedValue: ApplicationDefinition.makeNoopStep,
  }),
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SliderBinding],
})

const update = ApplicationComposition.makeUpdate({})
const view = ApplicationComposition.makeView.withInputs<
  Readonly<{ value: number; isDisabled?: boolean }>
>((model, { value, isDisabled }, h) =>
  h.block(
    SliderBinding.embedView({
      slotId: 'volume',
      model: model.slider,
      viewInputs: {
        value,
        ...(isDisabled === undefined ? {} : { isDisabled }),
        toView: (attributes: Slider.SliderAttributes) =>
          ih.div(
            [...attributes.root],
            [ih.div([...attributes.track]), ih.div([...attributes.thumb])],
          ),
      },
    }),
  ),
)

const model = Model.make({
  slider: Slider.SliderBlock.init({
    id: 'volume',
    min: 0,
    max: 10,
    step: 1,
  }).model,
})

// Defaults supply the full ViewInputs once. The returned factory produces
// a (model, h) view for scene, taking per-test overrides.
const sceneView = withViewInputs(view, { value: 5 })

scene(
  { update, view: sceneView() },
  given(model),
  expect(role('slider')).toHaveAttr('aria-valuenow', '5'),
)

scene(
  { update, view: sceneView({ isDisabled: true }) },
  given(model),
  expect(role('slider')).toHaveAttr('aria-disabled', 'true'),
)
