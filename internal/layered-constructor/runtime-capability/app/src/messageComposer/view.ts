import { String } from 'effect'

import { MessageComposerComposition } from './composition'
import { Message } from './message'
import { FocusInput } from './mount'

export const view = MessageComposerComposition.makeView((model, h) =>
  h.form(
    [h.OnSubmit(Message.SubmittedForm()), h.Class('message-composer')],
    [
      h.label([h.For(model.id), h.Class('sr-only')], ['Message']),
      h.input([
        h.Id(model.id),
        h.Value(model.text),
        h.Placeholder('Write a message'),
        h.OnInput(value => Message.UpdatedText({ value })),
        h.OnMount(FocusInput()),
      ]),
      h.button(
        [h.Type('submit'), h.Disabled(String.isEmpty(String.trim(model.text)))],
        ['Send'],
      ),
    ],
  ),
)
