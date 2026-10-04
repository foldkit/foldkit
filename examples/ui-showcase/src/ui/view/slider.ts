import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Slider } from '@foldkit/ui'

import { Message as UiMessage } from '../message'
import type { UiModel } from '../model'

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

export const view = Submodel.defineView<UiModel, UiMessage>(
  (model, h): Html => {
    const horizontalSliderView = (attributes: Slider.SliderAttributes): Html =>
      h.div(
        [h.Class(horizontalRowClassName)],
        [
          h.div(
            [h.Class(horizontalHeaderClassName)],
            [
              h.label(
                [...attributes.label, h.Class(labelClassName)],
                ['Rating'],
              ),
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

    const verticalSliderView = (attributes: Slider.SliderAttributes): Html =>
      h.div(
        [h.Class(verticalRowClassName)],
        [
          h.div(
            [h.Class(verticalHeaderClassName)],
            [
              h.label(
                [...attributes.label, h.Class(labelClassName)],
                ['Volume'],
              ),
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
        h.submodel({
          slotId: model.sliderRatingDemo.id,
          model: model.sliderRatingDemo,
          view: Slider.view,
          viewInputs: {
            value: model.sliderRatingValue,
            formatValue: value => `${value} of 10`,
            toView: horizontalSliderView,
          },
          toParentMessage: message =>
            UiMessage.GotSliderRatingDemoMessage({ message }),
        }),

        h.h3(
          [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
          ['Vertical'],
        ),
        h.submodel({
          slotId: model.sliderVolumeDemo.id,
          model: model.sliderVolumeDemo,
          view: Slider.view,
          viewInputs: {
            value: model.sliderVolumeValue,
            orientation: 'Vertical',
            thumbAlignment: 'Edge',
            thumbSize: '1.25rem',
            formatValue: value => `${Math.round(value * 100)} percent`,
            toView: verticalSliderView,
          },
          toParentMessage: message =>
            UiMessage.GotSliderVolumeDemoMessage({ message }),
        }),
      ],
    )
  },
)
