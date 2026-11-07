import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Slider } from '@foldkit/ui'

// Add two fields to your Model: the value you own, and the Slider Block's
// interaction state:
const Model = Schema.Struct({
  ratingValue: Schema.Number,
  ratingDemo: Slider.SliderBlock.Model,
  // ...your other fields
})
type Model = typeof Model.Type
// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})
type Message = typeof Message.Type

export const VolumeSliderKey = Symbol('VolumeSlider')
export const VolumeSliderBlock = Block.make('VolumeSlider', {
  key: VolumeSliderKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const {
  makeFieldsStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeComposition,
} = VolumeSliderBlock

// At module scope, fold the OutMessage into your own Model. `ChangedValue`
// carries the new number. Lift it to domain state, validate, or persist on
// each commit. The arm returns an Update.Step over the parent Model, which
// already has the next Slider Model written back. The parent Block
// checks the complete child union and infers the handler's Model:
// The Binding declares placement, typed startup, and OutMessage policy.
// The construction Layer below supplies the child implementation.
const RatingDemoBinding = makeRequiredFieldBinding(Slider.SliderBlock, {
  field: 'ratingDemo',
  init: {
    contextToArgs: () => [{ id: 'rating', min: 0, max: 10, step: 1 }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Slider.SliderBlock, {
    // The child has emitted `ChangedValue`. Store the new value in the field
    // you own. This arm is also where the parent can validate, persist, or
    // trigger a downstream Command.
    ChangedValue: ({ value }) =>
      makeFieldsStep(() => ({
        ratingValue: () => value,
      })),
  }),
})

const VolumeSliderComposition = makeComposition({
  bindings: [RatingDemoBinding],
})

// In your init function, seed the value (snapped to the range) and initialize
// the Slider Block with min / max / step and a unique id:
const init = VolumeSliderComposition.makeInit(() => ({
  model: {
    ratingValue: Slider.snapAndClamp(3, 0, 10, 1),
    // ...your other fields
  },
}))

const update = VolumeSliderComposition.makeUpdate({})

// Registering `RatingDemoBinding` in `bindings` also collects both drag Subscriptions.

// Inside your view function, render the slider. You control every element's
// markup and classes through the `toView` callback. The `attributes` groups
// provide ARIA, pointer, and keyboard wiring:
const view = VolumeSliderComposition.makeView((model, h) => {
  const sliderView = (attributes: Slider.SliderAttributes) =>
    h.div(
      [h.Class('flex flex-col gap-2 w-full max-w-sm')],
      [
        h.div(
          [h.Class('flex items-center justify-between text-sm')],
          [
            h.label([...attributes.label, h.Class('font-medium')], ['Rating']),
            h.span(
              [h.Class('tabular-nums text-gray-600')],
              [`${String(model.ratingValue)} / 10`],
            ),
          ],
        ),
        h.div(
          [
            ...attributes.root,
            h.Class('relative h-6 w-full flex items-center'),
          ],
          [
            h.div(
              [
                ...attributes.track,
                h.Class('h-1.5 w-full rounded-full bg-gray-200'),
              ],
              [
                h.div([
                  ...attributes.filledTrack,
                  h.Class('h-full rounded-full bg-blue-600'),
                ]),
              ],
            ),
            h.div([
              ...attributes.thumb,
              h.Class(
                'h-5 w-5 rounded-full bg-white border-2 border-blue-600 shadow cursor-grab focus-visible:ring-2 focus-visible:ring-blue-600 data-[dragging]:cursor-grabbing',
              ),
            ]),
          ],
        ),
      ],
    )

  return h.block(
    RatingDemoBinding.embedView({
      slotId: 'rating',
      model: model.ratingDemo,
      viewInputs: {
        value: model.ratingValue,
        formatValue: value => `${String(value)} of 10`,
        toView: sliderView,
      },
    }),
  )
})

export const layer = VolumeSliderBlock.makeLayer({
  init,
  update,
  view,
}).pipe(Layer.provide(Slider.layer))
