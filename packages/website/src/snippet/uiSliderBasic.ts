// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit each into your own Model, init, Message,
// update, view, and subscription definitions.
import { Schema, Tuple } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Slider } from '@foldkit/ui'
import { snapAndClamp as SliderSnapAndClamp } from '@foldkit/ui/slider'
import type { SliderAttributes as SliderSliderAttributes } from '@foldkit/ui/slider'

// Add two fields to your Model: the value you own, and the Slider Block's
// interaction state:
const Model = Schema.Struct({
  ratingValue: Schema.Number,
  ratingDemo: Slider.Model,
  // ...your other fields
})
type Model = typeof Model.Type

// Embed the Slider Message in your parent Message:
const Message = defineMessageUnion({
  GotSliderMessage: { message: Slider.Message },
})
type Message = typeof Message.Type

// At module scope, fold the OutMessage into your own Model. `ChangedValue`
// carries the new number. Lift it to domain state, validate, or persist on
// each commit. The arm returns an Update.Step over the parent Model, which
// already has the next Slider Model written back:
const foldSliderOutMessage = Slider.OutMessage.match<
  Update.Step<Model, Message>
>({
  // The child has emitted `ChangedValue`. Store the new value in the field
  // you own. This arm is also where the parent can validate, persist, or
  // trigger a downstream Command.
  ChangedValue:
    ({ value }) =>
    model => ({ model: modifyFields(model, { ratingValue: () => value }) }),
})

// The Binding wires the completed child Block into the parent: it runs Slider.update,
// writes the next Slider Model back, maps the Block's Commands into your
// Message type, and hands any OutMessage to the OutMessage fold.
const VolumeSlider = Block.define('VolumeSlider', {
  Model,
  Message,
})

const SliderBinding = VolumeSlider.bindChild(Slider.block, {
  field: 'ratingDemo',
  parentMessage: Message.GotSliderMessage,
  init: {
    args: () => Tuple.make({ id: 'rating', min: 0, max: 10, step: 1 }),
  },
  outMessage: { fold: foldSliderOutMessage },
})

const VolumeSliderComposition = VolumeSlider.makeComposition({
  childBindings: [SliderBinding],
})

// In your init function, seed the value (snapped to the range) and initialize
// the Slider Block with min / max / step and a unique id:
const init = VolumeSliderComposition.makeInit(() => ({
  model: {
    ratingValue: SliderSnapAndClamp(3, 0, 10, 1),
    // ...your other fields
  },
}))

const update = VolumeSliderComposition.makeUpdate()

// Registering `SliderBinding` in `childBindings` also collects both drag Subscriptions.

// Inside your view function, render the slider. You control every element's
// markup and classes through the `toView` callback. The `attributes` groups
// provide ARIA, pointer, and keyboard wiring:
const view = VolumeSliderComposition.makeView((model, h) => {
  const sliderView = (attributes: SliderSliderAttributes) =>
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
    SliderBinding.embedView({
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
