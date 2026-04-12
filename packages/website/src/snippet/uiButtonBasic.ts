import { Ui } from 'foldkit'

import { Class, button } from './html'

// Button is view-only — dispatch your own Message on click.

Ui.Button.view({
  onClick: ClickedSave(), // your Message
  toView: attributes =>
    button(
      [
        ...attributes.button,
        Class('px-4 py-2 rounded-lg bg-blue-600 text-white'),
      ],
      ['Save'],
    ),
})
