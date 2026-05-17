// Pseudocode — Select is view-only. Disabled selects display a fixed value
// and ignore onChange events.
import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

const view = () => {
  const h = html<Message>()

  return Ui.Select.view({
    id: 'country-disabled',
    isDisabled: true,
    value: 'us',
    toView: attributes =>
      h.div(
        [h.Class('flex flex-col gap-1.5')],
        [
          h.label(
            [...attributes.label, h.Class('text-sm font-medium')],
            ['Country'],
          ),
          h.select(
            [
              ...attributes.select,
              h.Class(
                'w-full rounded-lg border px-3 py-2 data-[disabled]:opacity-50',
              ),
            ],
            [
              h.option([h.Value('us')], ['United States']),
              h.option([h.Value('ca')], ['Canada']),
            ],
          ),
          h.span(
            [...attributes.description, h.Class('text-sm text-gray-500')],
            ['This select is disabled.'],
          ),
        ],
      ),
  })
}
