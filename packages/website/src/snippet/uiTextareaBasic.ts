// Pseudocode — Textarea is view-only. The value lives in your own Model as
// a string. Replace model.bio and UpdatedBio with your own field and Message.
import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

const view = (model: Model) => {
  const h = html<Message>()

  return Ui.Textarea.view({
    id: 'bio',
    value: model.bio, // your Model field
    onInput: value => UpdatedBio({ value }), // your Message
    placeholder: 'Tell us about yourself...',
    rows: 4,
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
              h.Class('w-full rounded-lg border border-gray-300 px-3 py-2'),
            ],
            [],
          ),
          h.span(
            [...attributes.description, h.Class('text-sm text-gray-500')],
            ['A brief introduction about yourself.'],
          ),
        ],
      ),
  })
}
