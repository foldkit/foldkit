import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { Slider } from '@foldkit/ui'
import type { SliderAttributes } from '@foldkit/ui/slider'

const Model = Schema.Struct({
  sliderRatingDemo: Slider.Slider,
  sliderRatingValue: Schema.Number,
  sliderVolumeDemo: Slider.Slider,
  sliderVolumeValue: Schema.Number,
})
type Model = typeof Model.Type

export class SliderPage extends Block<SliderPage>()('SliderPage', { Model }) {}

const horizontalRowClassName = 'flex flex-col gap-2 w-full max-w-sm'

const horizontalHeaderClassName =
  'flex items-center justify-between text-sm text-gray-900'

const verticalRowClassName = 'flex w-32 flex-col items-center gap-3'

const verticalHeaderClassName =
  'flex w-full items-baseline justify-between text-sm text-gray-900'

const labelClassName = 'font-medium cursor-pointer select-none'

const valueClassName = 'tabular-nums text-gray-600'

const horizontalRootClassName =
  'relative h-6 w-full flex items-center select-none touch-none'

const horizontalTrackClassName = 'h-1.5 w-full rounded-full bg-gray-200'

const horizontalFilledTrackClassName = 'h-full rounded-full bg-accent-600'

const verticalRootClassName =
  'relative h-48 w-6 flex justify-center select-none touch-none'

const verticalTrackClassName = 'h-full w-1.5 rounded-full bg-gray-200'

const verticalFilledTrackClassName = 'w-full rounded-full bg-accent-600'

const thumbClassName =
  'h-5 w-5 rounded-full bg-white border-2 border-accent-600 shadow cursor-grab focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 data-[dragging]:cursor-grabbing'

const ratingFormatted = (value: number): string => `${value} of 10`
const volumeFormatted = (value: number): string => `${Math.round(value * 100)}%`

const view = (model: Model, h: HtmlBuilder<never>): Html => {
  const horizontalSliderView = (attributes: SliderAttributes): Html =>
    h.div(
      [h.Class(horizontalRowClassName)],
      [
        h.div(
          [h.Class(horizontalHeaderClassName)],
          [
            h.label([...attributes.label, h.Class(labelClassName)], ['Rating']),
            h.span(
              [h.Class(valueClassName)],
              [ratingFormatted(model.sliderRatingValue)],
            ),
          ],
        ),
        h.div(
          [...attributes.root, h.Class(horizontalRootClassName)],
          [
            h.div(
              [...attributes.track, h.Class(horizontalTrackClassName)],
              [
                h.div([
                  ...attributes.filledTrack,
                  h.Class(horizontalFilledTrackClassName),
                ]),
              ],
            ),
            h.div([...attributes.thumb, h.Class(thumbClassName)]),
          ],
        ),
      ],
    )

  const verticalSliderView = (attributes: SliderAttributes): Html =>
    h.div(
      [h.Class(verticalRowClassName)],
      [
        h.div(
          [h.Class(verticalHeaderClassName)],
          [
            h.label([...attributes.label, h.Class(labelClassName)], ['Volume']),
            h.span(
              [h.Class(valueClassName)],
              [volumeFormatted(model.sliderVolumeValue)],
            ),
          ],
        ),
        h.div(
          [...attributes.root, h.Class(verticalRootClassName)],
          [
            h.div(
              [...attributes.track, h.Class(verticalTrackClassName)],
              [
                h.div([
                  ...attributes.filledTrack,
                  h.Class(verticalFilledTrackClassName),
                ]),
              ],
            ),
            h.div([...attributes.thumb, h.Class(thumbClassName)]),
          ],
        ),
      ],
    )

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Slider']),
      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Horizontal'],
      ),
      model.sliderRatingDemo.view({
        value: model.sliderRatingValue,
        formatValue: value => `${value} of 10`,
        toView: horizontalSliderView,
      }),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Vertical'],
      ),
      model.sliderVolumeDemo.view({
        value: model.sliderVolumeValue,
        orientation: 'Vertical',
        thumbAlignment: 'Edge',
        thumbSize: '1.25rem',
        formatValue: value => `${Math.round(value * 100)} percent`,
        toView: verticalSliderView,
      }),
    ],
  )
}

export const SliderPageLive = SliderPage.make(
  Effect.fn(function* () {
    const sliderRatingDemo = yield* new Slider.Slider('sliderRatingDemo', {
      id: 'slider-rating-demo',
      min: 0,
      max: 10,
      step: 1,
    })
    const sliderVolumeDemo = yield* new Slider.Slider('sliderVolumeDemo', {
      id: 'slider-volume-demo',
      min: 0,
      max: 1,
      step: 0.05,
    })

    return {
      model: {
        sliderRatingDemo,
        sliderRatingValue: 3,
        sliderVolumeDemo,
        sliderVolumeValue: 0.5,
      },

      update: {
        ...sliderRatingDemo.on({
          ChangedValue: (model, { value }) => ({
            model: modifyFields(model, { sliderRatingValue: () => value }),
          }),
        }),

        ...sliderVolumeDemo.on({
          ChangedValue: (model, { value }) => ({
            model: modifyFields(model, { sliderVolumeValue: () => value }),
          }),
        }),
      },

      view,
    }
  }),
).pipe(Layer.provide(Slider.SliderLive))
