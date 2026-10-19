import type { HtmlBuilder } from 'foldkit/html'

import { Slider } from '@foldkit/ui'

import { Message } from '../message'

// SHARED STYLES

const horizontalRowClassName = 'flex flex-col gap-2 w-full max-w-sm'

const horizontalHeaderClassName =
  'flex items-center justify-between text-sm text-gray-900 dark:text-white'

const verticalRowClassName = 'mx-auto flex w-32 flex-col items-center gap-3'

const verticalHeaderClassName =
  'flex w-full items-baseline justify-between text-sm text-gray-900 dark:text-white'

const labelClassName = 'font-medium cursor-pointer select-none'

const valueClassName =
  'tabular-nums text-gray-700 dark:text-gray-400 data-[disabled]:opacity-50'

const horizontalRootClassName =
  'relative h-6 w-full flex items-center select-none touch-none data-[disabled]:opacity-50'

const horizontalTrackClassName =
  'h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 data-[disabled]:cursor-not-allowed'

const horizontalFilledTrackClassName =
  'h-full rounded-full bg-accent-600 dark:bg-accent-500 data-[disabled]:bg-gray-400'

const verticalRootClassName =
  'relative h-48 w-6 flex justify-center select-none touch-none data-[disabled]:opacity-50'

const verticalTrackClassName =
  'h-full w-1.5 rounded-full bg-gray-200 dark:bg-gray-700 data-[disabled]:cursor-not-allowed'

const verticalFilledTrackClassName =
  'w-full rounded-full bg-accent-600 dark:bg-accent-500 data-[disabled]:bg-gray-400'

const thumbClassName =
  'h-5 w-5 rounded-full bg-white border-2 border-accent-600 dark:border-accent-500 shadow cursor-grab focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 dark:focus-visible:ring-accent-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 data-[dragging]:cursor-grabbing data-[disabled]:cursor-not-allowed data-[disabled]:border-gray-400'

// VIEW

const ratingFormatted = (value: number): string => `${String(value)} of 10`
const volumeFormatted = (value: number): string =>
  `${String(Math.round(value * 100))}%`

export const horizontalDemo = (
  ratingModel: Slider.Model,
  ratingValue: number,
  h: HtmlBuilder<Message>,
) => {
  return [
    h.submodel({
      slotId: ratingModel.id,
      model: ratingModel,
      view: Slider.view,
      viewInputs: {
        value: ratingValue,
        formatValue: value => `${String(value)} of 10`,
        toView: attributes =>
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
                    [ratingFormatted(ratingValue)],
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
          ),
      },
      toParentMessage: message =>
        Message.GotSliderRatingDemoMessage({ message }),
    }),
  ]
}

export const verticalDemo = (
  volumeModel: Slider.Model,
  volumeValue: number,
  h: HtmlBuilder<Message>,
) => {
  return [
    h.submodel({
      slotId: volumeModel.id,
      model: volumeModel,
      view: Slider.view,
      viewInputs: {
        value: volumeValue,
        orientation: 'Vertical',
        thumbAlignment: 'Edge',
        thumbSize: '1.25rem',
        formatValue: value => `${String(Math.round(value * 100))} percent`,
        toView: attributes =>
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
                    [volumeFormatted(volumeValue)],
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
          ),
      },
      toParentMessage: message =>
        Message.GotSliderVolumeDemoMessage({ message }),
    }),
  ]
}
