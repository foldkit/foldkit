import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button, Slider, SliderLive } from '@foldkit/ui'

export const FLOW_STRENGTH_MIN = 0.25
export const FLOW_STRENGTH_MAX = 3
export const FLOW_STRENGTH_STEP = 0.05
export const INITIAL_FLOW_STRENGTH = 1.4
export const NOISE_SCALE_MIN_DIVISOR = 0.4
export const NOISE_SCALE_MAX_DIVISOR = 2.4
export const NOISE_SCALE_STEP = 0.05
export const INITIAL_NOISE_SCALE = 1

const Model = Schema.Struct({
  flowStrength: Schema.Number,
  flowStrengthSlider: Slider.Slider,
  noiseScale: Schema.Number,
  noiseScaleSlider: Slider.Slider,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedTogglePlay: {},
  ClickedReset: {},
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  RequestedTogglePlay: {},
  RequestedReset: {},
})

type ViewInput = Readonly<{ isRunning: boolean; particleCount: number }>

export class Controls extends Block<Controls, void, ViewInput>()('Controls', {
  Model,
  Message,
  OutMessage,
}) {}

export const ControlsLive = Controls.make(
  Effect.fn(function* () {
    const flowStrengthSlider = yield* new Slider.Slider('flowStrengthSlider', {
      id: 'flow-strength-slider',
      min: FLOW_STRENGTH_MIN,
      max: FLOW_STRENGTH_MAX,
      step: FLOW_STRENGTH_STEP,
    })
    const noiseScaleSlider = yield* new Slider.Slider('noiseScaleSlider', {
      id: 'noise-scale-slider',
      min: NOISE_SCALE_MIN_DIVISOR,
      max: NOISE_SCALE_MAX_DIVISOR,
      step: NOISE_SCALE_STEP,
    })

    return {
      model: {
        flowStrength: Slider.snapAndClamp(
          INITIAL_FLOW_STRENGTH,
          FLOW_STRENGTH_MIN,
          FLOW_STRENGTH_MAX,
          FLOW_STRENGTH_STEP,
        ),
        flowStrengthSlider,
        noiseScale: Slider.snapAndClamp(
          INITIAL_NOISE_SCALE,
          NOISE_SCALE_MIN_DIVISOR,
          NOISE_SCALE_MAX_DIVISOR,
          NOISE_SCALE_STEP,
        ),
        noiseScaleSlider,
      },

      update: {
        ClickedTogglePlay: model => ({
          model,
          outMessage: OutMessage.RequestedTogglePlay(),
        }),
        ClickedReset: model => ({
          model,
          outMessage: OutMessage.RequestedReset(),
        }),
        ...flowStrengthSlider.on({
          ChangedValue: (model: Model, { value }) => ({
            model: modifyFields(model, { flowStrength: () => value }),
          }),
        }),
        ...noiseScaleSlider.on({
          ChangedValue: (model: Model, { value }) => ({
            model: modifyFields(model, { noiseScale: () => value }),
          }),
        }),
      },

      view: (model, h, { isRunning, particleCount }) =>
        h.div(
          [
            h.Class(
              'flex flex-wrap items-end gap-6 mt-6 px-6 py-4 rounded-xl ' +
                'bg-black/40 border border-white/10 backdrop-blur',
            ),
          ],
          [
            h.div(
              [h.Class('flex items-center gap-3')],
              [
                controlButton(
                  playPauseLabel(isRunning),
                  Message.ClickedTogglePlay(),
                  h,
                ),
                controlButton('Reset', Message.ClickedReset(), h),
                h.span(
                  [h.Class('text-xs uppercase tracking-widest text-white/40')],
                  [
                    h.span(
                      [
                        h.Class(
                          'inline-block tabular-nums text-right min-w-8 tracking-normal',
                        ),
                      ],
                      [`${particleCount}`],
                    ),
                    ' particles',
                  ],
                ),
              ],
            ),
            slider(
              'Turbulence',
              model.flowStrength,
              viewInputs => model.flowStrengthSlider.view(viewInputs),
              h,
            ),
            slider(
              'Noise scale',
              model.noiseScale,
              viewInputs => model.noiseScaleSlider.view(viewInputs),
              h,
            ),
          ],
        ),
    }
  }),
).pipe(Layer.provide(SliderLive))

type ControlsViewBuilder = HtmlBuilder<Message>

const buttonClass =
  'min-w-20 px-4 py-2 text-sm font-medium tracking-wide uppercase rounded-md ' +
  'border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 ' +
  'text-white/85 transition-colors duration-200'

const sliderRowClass = 'flex flex-col gap-2 min-w-44'

const sliderHeaderClass =
  'flex items-baseline justify-between text-xs uppercase tracking-widest text-white/60'

const sliderLabelClass = 'cursor-pointer select-none'

const sliderValueClass = 'text-white/40 tabular-nums'

const sliderRootClass =
  'relative h-5 w-full flex items-center select-none touch-none'

const sliderTrackClass =
  'h-5 w-full rounded-full bg-white/10 py-2 bg-clip-content cursor-pointer'

const sliderFilledTrackClass =
  'h-full rounded-full bg-fuchsia-400 py-2 bg-clip-content'

const sliderThumbClass =
  'h-3 w-3 rounded-full bg-white border border-fuchsia-400 shadow cursor-grab focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 focus-visible:ring-offset-1 focus-visible:ring-offset-black/40 data-[dragging]:cursor-grabbing'

const playPauseLabel = (isRunning: boolean): string =>
  isRunning ? 'Pause' : 'Play'

const slider = (
  label: string,
  value: number,
  render: (viewInputs: Slider.ViewInputs) => Html,
  h: ControlsViewBuilder,
): Html =>
  render({
    value,
    formatValue: value => value.toFixed(2),
    toView: attributes =>
      h.div(
        [h.Class(sliderRowClass)],
        [
          h.div(
            [h.Class(sliderHeaderClass)],
            [
              h.label(
                [...attributes.label, h.Class(sliderLabelClass)],
                [label],
              ),
              h.span([h.Class(sliderValueClass)], [value.toFixed(2)]),
            ],
          ),
          h.div(
            [...attributes.root, h.Class(sliderRootClass)],
            [
              h.div(
                [...attributes.track, h.Class(sliderTrackClass)],
                [
                  h.div([
                    ...attributes.filledTrack,
                    h.Class(sliderFilledTrackClass),
                  ]),
                ],
              ),
              h.div([...attributes.thumb, h.Class(sliderThumbClass)]),
            ],
          ),
        ],
      ),
  })

const controlButton = (
  label: string,
  onClick: Message,
  h: ControlsViewBuilder,
): Html =>
  Button.view(
    {
      onClick,
      toView: attributes =>
        h.button([...attributes.button, h.Class(buttonClass)], [label]),
    },
    h,
  )
