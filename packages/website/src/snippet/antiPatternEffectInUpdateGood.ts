// ✅ Good: update returns a Command and the Runtime performs the effect.

import { Effect } from 'effect'
import { Dom } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

const FocusSearchInput = Application.command('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
  handler: function* () {
    return () =>
      Dom.focus('#search-input').pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusSearchInput()),
      )
  },
})

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedOpenDialog: () => ({
      model: modifyFields(model, { dialogState: () => 'Open' }),
      commands: [FocusSearchInput()],
    }),
    CompletedFocusSearchInput: () => ({ model }),
  }),
)
