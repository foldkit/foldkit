// Pseudocode — Input is view-only. Disabled inputs display a fixed value
// and ignore onInput events.
import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

const view = () => {
  const h = html<Message>()

  return Ui.Input.view({
    id: 'email-disabled',
    isDisabled: true,
    value: 'ada@lovelace.dev',
    toView: attributes =>
      h.div(
        [h.Class('flex flex-col gap-1.5')],
        [
          h.label(
            [...attributes.label, h.Class('text-sm font-medium')],
            ['Email'],
          ),
          h.input([
            ...attributes.input,
            h.Class(
              'w-full rounded-lg border px-3 py-2 data-[disabled]:opacity-50',
            ),
          ]),
          h.span(
            [...attributes.description, h.Class('text-sm text-gray-500')],
            ['Contact your admin to update.'],
          ),
        ],
      ),
  })
}
