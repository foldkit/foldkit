import { Ui } from 'foldkit'

import { Class, div, label, span } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
  GotSliderPainDemoMessage,
  GotSliderVolumeDemoMessage,
  type Message,
} from './message'

// TABLE OF CONTENTS

export const sliderHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'slider',
  text: 'Slider',
}

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
  'h-full rounded-full bg-accent-600 data-[disabled]:bg-gray-400'

const thumbClassName =
  'h-5 w-5 rounded-full bg-white border-2 border-accent-600 shadow cursor-grab focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 data-[dragging]:cursor-grabbing data-[disabled]:cursor-not-allowed data-[disabled]:border-gray-400'

// VIEW

const painFormatted = (value: number): string => `${String(value)} of 10`
const volumeFormatted = (value: number): string =>
  `${String(Math.round(value * 100))}%`

export const sliderDemo = (
  painModel: Ui.Slider.Model,
  volumeModel: Ui.Slider.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => [
  div(
    [Class('flex flex-col gap-8 w-full max-w-sm')],
    [
      Ui.Slider.view({
        model: painModel,
        toParentMessage: message =>
          toParentMessage(GotSliderPainDemoMessage({ message })),
        formatValue: value => `${String(value)} of 10`,
        toView: attributes =>
          div(
            [Class(rowClassName)],
            [
              div(
                [Class(headerClassName)],
                [
                  label(
                    [...attributes.label, Class(labelClassName)],
                    ['Pain level'],
                  ),
                  span(
                    [Class(valueClassName)],
                    [painFormatted(painModel.value)],
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
        model: volumeModel,
        toParentMessage: message =>
          toParentMessage(GotSliderVolumeDemoMessage({ message })),
        formatValue: value => `${String(Math.round(value * 100))} percent`,
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
                    [volumeFormatted(volumeModel.value)],
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
]
