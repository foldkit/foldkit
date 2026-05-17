// Pseudocode — Fieldset is view-only. Nest other Foldkit UI components
// inside the fieldset body in your own view function.
import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

const view = () => {
  const h = html<Message>()

  return Ui.Fieldset.view({
    id: 'personal-info',
    toView: attributes =>
      h.fieldset(
        [...attributes.fieldset, h.Class('rounded-lg border p-6')],
        [
          h.legend(
            [...attributes.legend, h.Class('text-base font-semibold')],
            ['Personal Information'],
          ),
          h.span(
            [...attributes.description, h.Class('text-sm text-gray-500 mt-1')],
            ['We just need a few details.'],
          ),
          h.div(
            [h.Class('mt-4 flex flex-col gap-4')],
            [
              // Nest Input, Textarea, Checkbox, etc. here
            ],
          ),
        ],
      ),
  })
}
