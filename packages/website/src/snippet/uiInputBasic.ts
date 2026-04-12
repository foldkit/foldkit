import { Ui } from 'foldkit'

import { Class, div, input, label, span } from './html'

// Input is view-only — the value lives in your own Model as a string.

Ui.Input.view({
  id: 'full-name',
  value: model.name, // your Model field
  onInput: value => UpdatedName({ value }), // your Message
  placeholder: 'Enter your full name',
  toView: attributes =>
    div(
      [Class('flex flex-col gap-1.5')],
      [
        label([...attributes.label, Class('text-sm font-medium')], ['Name']),
        input([
          ...attributes.input,
          Class('w-full rounded-lg border border-gray-300 px-3 py-2'),
        ]),
        span(
          [...attributes.description, Class('text-sm text-gray-500')],
          ['As it appears on your government-issued ID.'],
        ),
      ],
    ),
})
