// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Add a field to your Model for the Switch Submodel:
const Model = S.Struct({
  switchDemo: Ui.Switch.Model,
  // ...your other fields
})

// In your init function, initialize the Switch Submodel with a unique id:
const init = () => [
  {
    switchDemo: Ui.Switch.init({ id: 'notifications' }),
    // ...your other fields
  },
  [],
]

// Embed the Switch Message in your parent Message:
const GotSwitchMessage = m('GotSwitchMessage', {
  message: Ui.Switch.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to Switch.update:
GotSwitchMessage: ({ message }) => {
  const [nextSwitch, commands] = Ui.Switch.update(model.switchDemo, message)

  return [
    // Merge the next state into your Model:
    evo(model, { switchDemo: () => nextSwitch }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(Effect.map(message => GotSwitchMessage({ message }))),
    ),
  ]
}

// Inside your view function, render the switch:
const view = () => {
  const h = html<Message>()

  return Ui.Switch.view({
    model: model.switchDemo,
    toParentMessage: message => GotSwitchMessage({ message }),
    toView: attributes =>
      h.div(
        [h.Class('flex items-center gap-3')],
        [
          h.button(
            [
              ...attributes.button,
              h.Class(
                'relative h-6 w-11 rounded-full transition-colors data-[checked]:bg-blue-600 bg-gray-200',
              ),
            ],
            [
              h.div(
                [
                  h.Class(
                    'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  ),
                ],
                [],
              ),
            ],
          ),
          h.div(
            [],
            [
              h.label(
                [...attributes.label, h.Class('text-sm font-medium')],
                ['Enable notifications'],
              ),
              h.p(
                [...attributes.description, h.Class('text-sm text-gray-500')],
                ['Get notified when something important happens.'],
              ),
            ],
          ),
        ],
      ),
  })
}
