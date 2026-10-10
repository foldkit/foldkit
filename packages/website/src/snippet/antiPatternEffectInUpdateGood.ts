// ✅ Good: update returns a Command and the Runtime performs the effect.

import { Effect } from 'effect'
import { Command, Dom, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
  handler: function* () {
    return () =>
      Dom.focus('#search-input').pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusSearchInput()),
      )
  },
})

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedOpenDialog: () => ({
      model: modifyFields(model, { dialogState: () => 'Open' }),
      commands: [FocusSearchInput()],
    }),
    CompletedFocusSearchInput: () => ({ model }),
  }),
)
