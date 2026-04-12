import { Ui } from 'foldkit'

import { Class, label, span, textarea } from './html'

Ui.Textarea.view({
  id: 'bio-disabled',
  isDisabled: true,
  value: 'Known for work on the Analytical Engine.',
  rows: 3,
  toView: attributes =>
    div(
      [Class('flex flex-col gap-1.5')],
      [
        label([...attributes.label, Class('text-sm font-medium')], ['Bio']),
        textarea(
          [
            ...attributes.textarea,
            Class(
              'w-full rounded-lg border px-3 py-2 data-[disabled]:opacity-50',
            ),
          ],
          [],
        ),
        span(
          [...attributes.description, Class('text-sm text-gray-500')],
          ['This textarea is disabled.'],
        ),
      ],
    ),
})
