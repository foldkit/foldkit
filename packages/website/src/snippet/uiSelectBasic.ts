// Pseudocode — Select is view-only. The selected value lives in your own
// Model as a string. Replace model.country and UpdatedCountry with your
// own field and Message.
import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

const view = () => {
  const h = html<Message>()

  return Ui.Select.view({
    id: 'country',
    value: model.country, // your Model field
    onChange: value => UpdatedCountry({ value }), // your Message
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
              h.Class('w-full rounded-lg border px-3 py-2'),
            ],
            [
              h.option([h.Value('us')], ['United States']),
              h.option([h.Value('ca')], ['Canada']),
              h.option([h.Value('gb')], ['United Kingdom']),
            ],
          ),
          h.span(
            [...attributes.description, h.Class('text-sm text-gray-500')],
            ['Where you currently reside.'],
          ),
        ],
      ),
  })
}
