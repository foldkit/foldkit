import { Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

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

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Slider']),
      h.div(
        [h.Class('flex flex-col gap-8 max-w-sm')],
        [
          h.submodel({
            slotId: model.sliderRatingDemo.id,
            model: model.sliderRatingDemo,
            view: Ui.Slider.view,
            viewInputs: {
              formatValue: value => `${value} of 10`,
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
                          [ratingFormatted(model.sliderRatingDemo.value)],
                        ),
                      ],
                    ),
                    h.div(
                      [...attributes.root, h.Class(rootClassName)],
                      [
                        h.div(
                          [...attributes.track, h.Class(trackClassName)],
                          [
                            h.div(
                              [
                                ...attributes.filledTrack,
                                h.Class(filledTrackClassName),
                              ],
                              [],
                            ),
                          ],
                        ),
                        h.div(
                          [...attributes.thumb, h.Class(thumbClassName)],
                          [],
                        ),
                      ],
                    ),
                  ],
                ),
            },
            toParentMessage: message => GotSliderRatingDemoMessage({ message }),
          }),
          h.submodel({
            slotId: model.sliderVolumeDemo.id,
            model: model.sliderVolumeDemo,
            view: Ui.Slider.view,
            viewInputs: {
              formatValue: value => `${Math.round(value * 100)} percent`,
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
                          [volumeFormatted(model.sliderVolumeDemo.value)],
                        ),
                      ],
                    ),
                    h.div(
                      [...attributes.root, h.Class(rootClassName)],
                      [
                        h.div(
                          [...attributes.track, h.Class(trackClassName)],
                          [
                            h.div(
                              [
                                ...attributes.filledTrack,
                                h.Class(filledTrackClassName),
                              ],
                              [],
                            ),
                          ],
                        ),
                        h.div(
                          [...attributes.thumb, h.Class(thumbClassName)],
                          [],
                        ),
                      ],
                    ),
                  ],
                ),
            },
            toParentMessage: message => GotSliderVolumeDemoMessage({ message }),
          }),
        ],
      ),
    ],
  )
})
