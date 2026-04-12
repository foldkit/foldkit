import { Ui } from 'foldkit'

import { Class, div, label, span, textarea } from './html'

// Textarea is view-only — the value lives in your own Model as a string.

Ui.Textarea.view({
  id: 'bio',
  value: model.bio, // your Model field
  onInput: value => UpdatedBio({ value }), // your Message
  placeholder: 'Tell us about yourself...',
  rows: 4,
  toView: attributes =>
    div(
      [Class('flex flex-col gap-1.5')],
      [
        label([...attributes.label, Class('text-sm font-medium')], ['Bio']),
        textarea(
          [
            ...attributes.textarea,
            Class('w-full rounded-lg border border-gray-300 px-3 py-2'),
          ],
          [],
        ),
        span(
          [...attributes.description, Class('text-sm text-gray-500')],
          ['A brief introduction about yourself.'],
        ),
      ],
    ),
})
