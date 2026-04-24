import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, div, h2, label, span } from '../html'
import type { Message as ParentMessage } from '../main'
import {
  GotSliderRatingDemoMessage,
  GotSliderVolumeDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

const rowClassName = 'flex flex-col gap-2 w-full max-w-sm'

const headerClassName =
  'flex items-center justify-between text-sm text-gray-900'

const labelClassName = 'font-medium cursor-pointer select-none'

const valueClassName = 'tabular-nums text-gray-600'

const rootClassName =
  'relative h-6 w-full flex items-center select-none touch-none'

const trackClassName = 'h-1.5 w-full rounded-full bg-gray-200'

const filledTrackClassName = 'h-full rounded-full bg-accent-600'

const thumbClassName =
  'h-5 w-5 rounded-full bg-white border-2 border-accent-600 shadow cursor-grab focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 data-[dragging]:cursor-grabbing'

const ratingFormatted = (value: number): string => `${value} of 10`
const volumeFormatted = (value: number): string => `${Math.round(value * 100)}%`

export const view = (
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Slider']),
      div(
        [Class('flex flex-col gap-8 max-w-sm')],
        [
          Ui.Slider.view({
            model: model.sliderRatingDemo,
            toParentMessage: message =>
              toParentMessage(GotSliderRatingDemoMessage({ message })),
            formatValue: value => `${value} of 10`,
            toView: attributes =>
              div(
                [Class(rowClassName)],
                [
                  div(
                    [Class(headerClassName)],
                    [
                      label(
                        [...attributes.label, Class(labelClassName)],
                        ['Rating'],
                      ),
                      span(
                        [Class(valueClassName)],
                        [ratingFormatted(model.sliderRatingDemo.value)],
                      ),
                    ],
                  ),
                  div(
                    [...attributes.root, Class(rootClassName)],
                    [
                      div(
                        [...attributes.track, Class(trackClassName)],
                        [
                          div(
                            [
                              ...attributes.filledTrack,
                              Class(filledTrackClassName),
                            ],
                            [],
                          ),
                        ],
                      ),
                      div([...attributes.thumb, Class(thumbClassName)], []),
                    ],
                  ),
                ],
              ),
          }),
          Ui.Slider.view({
            model: model.sliderVolumeDemo,
            toParentMessage: message =>
              toParentMessage(GotSliderVolumeDemoMessage({ message })),
            formatValue: value => `${Math.round(value * 100)} percent`,
            toView: attributes =>
              div(
                [Class(rowClassName)],
                [
                  div(
                    [Class(headerClassName)],
                    [
                      label(
                        [...attributes.label, Class(labelClassName)],
                        ['Volume'],
                      ),
                      span(
                        [Class(valueClassName)],
                        [volumeFormatted(model.sliderVolumeDemo.value)],
                      ),
                    ],
                  ),
                  div(
                    [...attributes.root, Class(rootClassName)],
                    [
                      div(
                        [...attributes.track, Class(trackClassName)],
                        [
                          div(
                            [
                              ...attributes.filledTrack,
                              Class(filledTrackClassName),
                            ],
                            [],
                          ),
                        ],
                      ),
                      div([...attributes.thumb, Class(thumbClassName)], []),
                    ],
                  ),
                ],
              ),
          }),
        ],
      ),
    ],
  )
