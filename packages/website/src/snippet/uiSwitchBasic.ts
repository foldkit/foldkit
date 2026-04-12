import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, button, div, label, p } from './html'

// Submodel wiring — same pattern as Checkbox:
//   Model field: switchDemo: Ui.Switch.Model
//   Init: Ui.Switch.init({ id: 'notifications' })
//   Update: delegate via Ui.Switch.update

const GotSwitchMessage = m('GotSwitchMessage', {
  message: Ui.Switch.Message,
})

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
            // Knob that slides on toggle
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
