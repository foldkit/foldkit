// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, view, and subscription definitions.
import { Effect, Schema as S, Stream } from 'effect'
import { Command, Subscription, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, label, span } from './html'

// Add a field to your Model for the Slider Submodel:
const Model = S.Struct({
  ratingDemo: Ui.Slider.Model,
  // ...your other fields
})

// In your init function, initialize the Slider Submodel with min / max /
// step and a unique id:
const init = () => [
  {
    ratingDemo: Ui.Slider.init({
      id: 'rating',
      min: 0,
      max: 10,
      step: 1,
      initialValue: 3,
    }),
    // ...your other fields
  },
  [],
]

// Embed the Slider Message in your parent Message:
const GotSliderMessage = m('GotSliderMessage', {
  message: Ui.Slider.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to Slider.update:
GotSliderMessage: ({ message }) => {
  const [nextSlider, commands] = Ui.Slider.update(model.ratingDemo, message)

  return [
    // Merge the next state into your Model:
    evo(model, { ratingDemo: () => nextSlider }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(Effect.map(message => GotSliderMessage({ message }))),
    ),
  ]
}

// Wire the Slider's document-level drag subscriptions into your app's
// SubscriptionDeps and subscriptions. This is what powers pointer drag and
// Escape-to-cancel:
const sliderFields = Ui.Slider.SubscriptionDeps.fields

const SubscriptionDeps = S.Struct({
  sliderPointer: sliderFields['documentPointer'],
  sliderEscape: sliderFields['documentEscape'],
  // ...your other subscription deps
})

const sliderSubscriptions = Ui.Slider.subscriptions

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  sliderPointer: {
    modelToDependencies: model =>
      sliderSubscriptions.documentPointer.modelToDependencies(model.ratingDemo),
    dependenciesToStream: (dependencies, readDependencies) =>
      sliderSubscriptions.documentPointer
        .dependenciesToStream(dependencies, readDependencies)
        .pipe(Stream.map(message => GotSliderMessage({ message }))),
  },
  sliderEscape: {
    modelToDependencies: model =>
      sliderSubscriptions.documentEscape.modelToDependencies(model.ratingDemo),
    dependenciesToStream: (dependencies, readDependencies) =>
      sliderSubscriptions.documentEscape
        .dependenciesToStream(dependencies, readDependencies)
        .pipe(Stream.map(message => GotSliderMessage({ message }))),
  },
})

// Inside your view function, render the slider. You control every element's
// markup and classes through the `toView` callback. The `attributes` groups
// provide ARIA, pointer, and keyboard wiring:
Ui.Slider.view({
  model: model.ratingDemo,
  toParentMessage: message => GotSliderMessage({ message }),
  formatValue: value => `${String(value)} of 10`,
  toView: attributes =>
    div(
      [Class('flex flex-col gap-2 w-full max-w-sm')],
      [
        div(
          [Class('flex items-center justify-between text-sm')],
          [
            label([...attributes.label, Class('font-medium')], ['Rating']),
            span(
              [Class('tabular-nums text-gray-600')],
              [`${String(model.ratingDemo.value)} / 10`],
            ),
          ],
        ),
        div(
          [...attributes.root, Class('relative h-6 w-full flex items-center')],
          [
            div(
              [
                ...attributes.track,
                Class('h-1.5 w-full rounded-full bg-gray-200'),
              ],
              [
                div(
                  [
                    ...attributes.filledTrack,
                    Class('h-full rounded-full bg-blue-600'),
                  ],
                  [],
                ),
              ],
            ),
            div(
              [
                ...attributes.thumb,
                Class(
                  'h-5 w-5 rounded-full bg-white border-2 border-blue-600 shadow cursor-grab focus-visible:ring-2 focus-visible:ring-blue-600 data-[dragging]:cursor-grabbing',
                ),
              ],
              [],
            ),
          ],
        ),
      ],
    ),
})
