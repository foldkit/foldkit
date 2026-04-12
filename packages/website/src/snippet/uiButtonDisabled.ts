import { Ui } from 'foldkit'

import { Class, button } from './html'

Ui.Button.view({
  isDisabled: true,
  toView: attributes =>
    button(
      [
        ...attributes.button,
        Class('px-4 py-2 rounded-lg bg-gray-300 text-gray-500'),
      ],
      ['Disabled'],
    ),
})
