// Pseudocode — Textarea is view-only. Disabled textareas display a fixed
// value and ignore onInput events.
import type { HtmlBuilder } from 'foldkit/html'

import {
  type TextareaAttributes,
  view as uiTextareaView,
} from '@foldkit/ui/textarea'

const view = (h: HtmlBuilder<Message>) => {
  const textareaView = (attributes: TextareaAttributes<Message>) =>
    h.div(
      [h.Class('flex flex-col gap-1.5')],
      [
        h.label([...attributes.label, h.Class('text-sm font-medium')], ['Bio']),
        h.textarea([
          ...attributes.textarea,
          h.Class(
            'w-full rounded-lg border px-3 py-2 data-[disabled]:opacity-50',
          ),
        ]),
        h.span(
          [...attributes.description, h.Class('text-sm text-gray-500')],
          ['This textarea is disabled.'],
        ),
      ],
    )

  return uiTextareaView(
    {
      id: 'bio-disabled',
      isDisabled: true,
      hasDescription: true,
      value: 'Known for work on the Analytical Engine.',
      rows: 3,
      toView: textareaView,
    },
    h,
  )
}
