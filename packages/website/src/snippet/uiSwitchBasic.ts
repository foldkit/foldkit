// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option } from 'effect'
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

// Inside your update function's M.tagsExhaustive({...}), delegate to
// Ui.Switch.update. The OutMessage's `ToggledChecked` carries the new
// `isChecked` value. Use it to save a preference, sync to a backend,
// or trigger a side effect at the toggle moment.
GotSwitchMessage: ({ message }) => {
  const [nextSwitch, commands, maybeOutMessage] = Ui.Switch.update(
    model.switchDemo,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotSwitchMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      evo(model, { switchDemo: () => nextSwitch }),
      mappedCommands,
    ],
    onSome: M.type<Ui.Switch.OutMessage>().pipe(
      M.tagsExhaustive({
        ToggledChecked: ({ isChecked }) => {
          // The child has emitted `ToggledChecked`. The body commits
          // the child's next state as usual. In this arm the parent
          // can also update its own state or dispatch its own
          // Commands, for example persist the preference, fire
          // analytics, or dispatch a downstream Command.
          return [evo(model, { switchDemo: () => nextSwitch }), mappedCommands]
        },
      }),
    ),
  })
}

// Inside your view function, embed the Switch via h.submodel:
const view = () => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'switch-demo',
    model: model.switchDemo,
    view: Ui.Switch.view,
    viewInputs: {
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
    },
    toParentMessage: message => GotSwitchMessage({ message }),
  })
}
