// Pseudocode — Button is view-only. Replace ClickedSave() with your own
// Message constructor.
import { Ui } from 'foldkit'

import { Class, button } from './html'

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
