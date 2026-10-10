import { Effect } from 'effect'
import { Command, Dom, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import type { Model } from './model'

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

// ✅ Return the next Model and a Command
const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    OpenedDialog: () => ({
      model: modifyFields(model, { dialogState: () => 'Open' }),
      commands: [FocusSearchInput()],
    }),
    CompletedFocusSearchInput: () => ({ model }),
  }),
)
