import type { HtmlBuilder } from 'foldkit/html'

import { Slider } from '@foldkit/ui'

import { Message } from '../message'

// SHARED STYLES

const rowClassName = 'flex flex-col gap-2 w-full max-w-sm'

const headerClassName =
  'flex items-center justify-between text-sm text-gray-900 dark:text-white'

const labelClassName = 'font-medium cursor-pointer select-none'

const valueClassName =
  'tabular-nums text-gray-600 dark:text-gray-400 data-[disabled]:opacity-50'

const rootClassName =
  'relative h-6 w-full flex items-center select-none touch-none data-[disabled]:opacity-50'

const trackClassName =
  'h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 data-[disabled]:cursor-not-allowed'

const filledTrackClassName =
  'h-full rounded-full bg-accent-600 dark:bg-accent-500 data-[disabled]:bg-gray-400'

const thumbClassName =
  'h-5 w-5 rounded-full bg-white border-2 border-accent-600 dark:border-accent-500 shadow cursor-grab focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 dark:focus-visible:ring-accent-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 data-[dragging]:cursor-grabbing data-[disabled]:cursor-not-allowed data-[disabled]:border-gray-400'

// VIEW

const ratingFormatted = (value: number): string => `${String(value)} of 10`
const volumeFormatted = (value: number): string =>
  `${String(Math.round(value * 100))}%`

type SliderDemoInputs = Readonly<{
  ratingModel: Slider.Model
  ratingValue: number
  volumeModel: Slider.Model
  volumeValue: number
}>

export const view = (
  { ratingModel, ratingValue, volumeModel, volumeValue }: SliderDemoInputs,
  h: HtmlBuilder<Message>,
) => {
  return [
    h.div(
      [h.Class('flex flex-col gap-8 w-full max-w-sm')],
      [
        h.submodel({
          slotId: ratingModel.id,
          model: ratingModel,
          view: Slider.view,
          viewInputs: {
            value: ratingValue,
            formatValue: value => `${String(value)} of 10`,
            toView: attributes =>
              h.div(
                [h.Class(rowClassName)],
                [
                  h.div(
                    [h.Class(headerClassName)],
                    [
                      h.label(
                        [...attributes.label, h.Class(labelClassName)],
                        ['Rating'],
                      ),
                      h.span(
                        [h.Class(valueClassName)],
                        [ratingFormatted(ratingValue)],
                      ),
                    ],
                  ),
                  h.div(
                    [...attributes.root, h.Class(rootClassName)],
                    [
                      h.div(
                        [...attributes.track, h.Class(trackClassName)],
                        [
                          h.div([
                            ...attributes.filledTrack,
                            h.Class(filledTrackClassName),
                          ]),
                        ],
                      ),
                      h.div([...attributes.thumb, h.Class(thumbClassName)]),
                    ],
                  ),
                ],
              ),
          },
          toParentMessage: message =>
            Message.GotSliderRatingDemoMessage({ message }),
        }),
        h.submodel({
          slotId: volumeModel.id,
          model: volumeModel,
          view: Slider.view,
          viewInputs: {
            value: volumeValue,
            formatValue: value => `${String(Math.round(value * 100))} percent`,
            toView: attributes =>
              h.div(
                [h.Class(rowClassName)],
                [
                  h.div(
                    [h.Class(headerClassName)],
                    [
                      h.label(
                        [...attributes.label, h.Class(labelClassName)],
                        ['Volume'],
                      ),
                      h.span(
                        [h.Class(valueClassName)],
                        [volumeFormatted(volumeValue)],
                      ),
                    ],
                  ),
                  h.div(
                    [...attributes.root, h.Class(rootClassName)],
                    [
                      h.div(
                        [...attributes.track, h.Class(trackClassName)],
                        [
                          h.div([
                            ...attributes.filledTrack,
                            h.Class(filledTrackClassName),
                          ]),
                        ],
                      ),
                      h.div([...attributes.thumb, h.Class(thumbClassName)]),
                    ],
                  ),
                ],
              ),
          },
          toParentMessage: message =>
            Message.GotSliderVolumeDemoMessage({ message }),
        }),
      ],
    ),
  ]
}
