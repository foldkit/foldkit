// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit each into your own Model, init, Message,
// update, view, and subscription definitions.
import { Match as M, Option, Schema as S } from 'effect'
import { Command, Subscription, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

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

// Inside your update function's M.tagsExhaustive({...}), delegate to
// Ui.Slider.update. The OutMessage's `ChangedValue` carries the new
// number. Lift it to domain state, validate, or persist on each commit.
GotSliderMessage: ({ message }) => {
  const [nextSlider, commands, maybeOutMessage] = Ui.Slider.update(
    model.ratingDemo,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotSliderMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      evo(model, { ratingDemo: () => nextSlider }),
      mappedCommands,
    ],
    onSome: M.type<Ui.Slider.OutMessage>().pipe(
      M.tagsExhaustive({
        ChangedValue: ({ value }) => [
          // The child has emitted `ChangedValue`. The body commits
          // the child's next state as usual. In this arm the parent
          // can also update its own state or dispatch its own
          // Commands, for example persist the value, validate, or
          // trigger a downstream Command.
          evo(model, { ratingDemo: () => nextSlider }),
          mappedCommands,
        ],
      }),
    ),
  })
}

// NOTE: wire BOTH dragPointer and dragEscape. Without dragEscape, pressing
// Escape during a drag won't cancel back to the origin value, but every
// other drag mechanic still works. Silent partial breakage.
const sliderSubscriptions = Subscription.lift({
  sliderPointer: Ui.Slider.subscriptions.dragPointer,
  sliderEscape: Ui.Slider.subscriptions.dragEscape,
})<Model, Message>({
  toChildModel: model => model.ratingDemo,
  toParentMessage: message => GotSliderMessage({ message }),
})

const subscriptions = Subscription.aggregate<Model, Message>()(
  sliderSubscriptions,
  // ...your other subscription records
)

// Inside your view function, render the slider. You control every element's
// markup and classes through the `toView` callback. The `attributes` groups
// provide ARIA, pointer, and keyboard wiring:
const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'rating',
    model: model.ratingDemo,
    view: Ui.Slider.view,
    viewInputs: {
      formatValue: value => `${String(value)} of 10`,
      toView: attributes =>
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
                  [`${String(model.ratingDemo.value)} / 10`],
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
                    h.div(
                      [
                        ...attributes.filledTrack,
                        h.Class('h-full rounded-full bg-blue-600'),
                      ],
                      [],
                    ),
                  ],
                ),
                h.div(
                  [
                    ...attributes.thumb,
                    h.Class(
                      'h-5 w-5 rounded-full bg-white border-2 border-blue-600 shadow cursor-grab focus-visible:ring-2 focus-visible:ring-blue-600 data-[dragging]:cursor-grabbing',
                    ),
                  ],
                  [],
                ),
              ],
            ),
          ],
        ),
    },
    toParentMessage: message => GotSliderMessage({ message }),
  })
}
