// Pseudocode — Textarea is view-only. Disabled textareas display a fixed
// value and ignore onInput events.
import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

const view = () => {
  const h = html<Message>()

  return Ui.Textarea.view({
    id: 'bio-disabled',
    isDisabled: true,
    value: 'Known for work on the Analytical Engine.',
    rows: 3,
    toView: attributes =>
      h.div(
        [h.Class('flex flex-col gap-1.5')],
        [
          h.label(
            [...attributes.label, h.Class('text-sm font-medium')],
            ['Bio'],
          ),
          h.textarea(
            [
              ...attributes.textarea,
              h.Class(
                'w-full rounded-lg border px-3 py-2 data-[disabled]:opacity-50',
              ),
            ],
            [],
          ),
          h.span(
            [...attributes.description, h.Class('text-sm text-gray-500')],
            ['This textarea is disabled.'],
          ),
        ],
      ),
  })
}
