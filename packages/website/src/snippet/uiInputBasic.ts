// Pseudocode — Input is view-only. The value lives in your own Model as a
// string. Replace model.name and UpdatedName with your own field and Message.
import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

const view = (model: Model) => {
  const h = html<Message>()

  return Ui.Input.view({
    id: 'full-name',
    value: model.name, // your Model field
    onInput: value => UpdatedName({ value }), // your Message
    placeholder: 'Enter your full name',
    toView: attributes =>
      h.div(
        [h.Class('flex flex-col gap-1.5')],
        [
          h.label(
            [...attributes.label, h.Class('text-sm font-medium')],
            ['Name'],
          ),
          h.input([
            ...attributes.input,
            h.Class('w-full rounded-lg border border-gray-300 px-3 py-2'),
          ]),
          h.span(
            [...attributes.description, h.Class('text-sm text-gray-500')],
            ['As it appears on your government-issued ID.'],
          ),
        ],
      ),
  })
}
