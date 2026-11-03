import { Effect } from 'effect'

import {
  Message,
  MessageComposerComposition,
  MessageComposerDefinition,
  Model,
} from './blockInMessageDefinition'
import { receive, update } from './blockInMessageHandlers'

const init = MessageComposerComposition.makeInit(id => ({
  model: Model.make({ id, text: '' }),
}))
const view = MessageComposerComposition.makeView((model, h) =>
  h.form(
    [h.OnSubmit(Message.SubmittedForm())],
    [
      h.label([h.For(model.id)], ['Message']),
      h.input([
        h.Id(model.id),
        h.Value(model.text),
        h.OnInput(value => Message.UpdatedText({ value })),
      ]),
      h.button([h.Type('submit')], ['Send']),
    ],
  ),
)

export const MessageComposerImplementation =
  MessageComposerDefinition.makeBlock(
    Effect.gen(function* () {
      return {
        children: [],
        init,
        update,
        receive,
        view,
      }
    }),
  )

export const layer = MessageComposerImplementation.layer
