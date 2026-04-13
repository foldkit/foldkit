// Pseudocode — Input is view-only. Disabled inputs display a fixed value
// and ignore onInput events.
import { Ui } from 'foldkit'

import { Class, input, label, span } from './html'

Ui.Input.view({
  id: 'email-disabled',
  isDisabled: true,
  value: 'ada@lovelace.dev',
  toView: attributes =>
    div(
      [Class('flex flex-col gap-1.5')],
      [
        label([...attributes.label, Class('text-sm font-medium')], ['Email']),
        input([
          ...attributes.input,
          Class(
            'w-full rounded-lg border px-3 py-2 data-[disabled]:opacity-50',
          ),
        ]),
        span(
          [...attributes.description, Class('text-sm text-gray-500')],
          ['Contact your admin to update.'],
        ),
      ],
    ),
})
