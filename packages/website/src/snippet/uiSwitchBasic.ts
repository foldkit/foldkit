import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, button, div, label, p } from './html'

// MODEL — embed Switch.Model as a Submodel field
//   switchDemo: Ui.Switch.Model

// INIT
//   switchDemo: Ui.Switch.init({ id: 'notifications' })

// MESSAGE — embed the Switch Message in your parent Message

const GotSwitchMessage = m('GotSwitchMessage', {
  message: Ui.Switch.Message,
})

// UPDATE — delegate to Switch.update

GotSwitchMessage: ({ message }) => {
  const [nextSwitch, commands] = Ui.Switch.update(model.switchDemo, message)

  return [
    evo(model, { switchDemo: () => nextSwitch }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotSwitchMessage({ message }))),
    ),
  ]
}

// VIEW

Ui.Switch.view({
  model: model.switchDemo,
  toParentMessage: message => GotSwitchMessage({ message }),
  toView: attributes =>
    div(
      [Class('flex items-center gap-3')],
      [
        button(
          [
            ...attributes.button,
            Class(
              'relative h-6 w-11 rounded-full transition-colors data-[checked]:bg-blue-600 bg-gray-200',
            ),
          ],
          [
            div(
              [
                Class(
                  'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                ),
              ],
              [],
            ),
          ],
        ),
        div(
          [],
          [
            label(
              [...attributes.label, Class('text-sm font-medium')],
              ['Enable notifications'],
            ),
            p(
              [...attributes.description, Class('text-sm text-gray-500')],
              ['Get notified when something important happens.'],
            ),
          ],
        ),
      ],
    ),
})
