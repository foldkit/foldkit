import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Slider } from '@foldkit/ui'
import { snapAndClamp as SliderSnapAndClamp } from '@foldkit/ui/slider'
import type { SliderAttributes as SliderSliderAttributes } from '@foldkit/ui/slider'

export class Rating extends Block<Rating>()('Rating', {
  Model: Schema.Struct({
    ratingDemo: Slider.Slider,
    ratingValue: Schema.Number,
  }),
}) {}

export const RatingLive = Rating.make(
  Effect.fn(function* () {
    const ratingDemo = yield* new Slider.Slider('ratingDemo', {
      id: 'rating',
      min: 0,
      max: 10,
      step: 1,
    })

    return {
      // Seed the value you own, snapped to the Slider's range
      model: { ratingDemo, ratingValue: SliderSnapAndClamp(3, 0, 10, 1) },

      update: {
        // Store each new value in the field you own
        ...ratingDemo.on({
          ChangedValue: (model, { value }) => ({
            model: modifyFields(model, { ratingValue: () => value }),
          }),
        }),
      },

      // You control every element's markup and classes through `toView`. The
      // `attributes` groups provide ARIA, pointer, and keyboard wiring.
      view: (model, h) => {
        const sliderView = (attributes: SliderSliderAttributes) =>
          h.div(
            [h.Class('flex flex-col gap-2 w-full max-w-sm')],
            [
              h.div(
                [h.Class('flex items-center justify-between text-sm')],
                [
                  h.label(
                    [...attributes.label, h.Class('font-medium')],
                    ['Rating'],
                  ),
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

        return model.ratingDemo.view({
          value: model.ratingValue,
          formatValue: value => `${String(value)} of 10`,
          toView: sliderView,
        })
      },
    }
  }),
).pipe(Layer.provide(Slider.SliderLive))
