// ✅ Good: update returns a Command and the Runtime performs the effect.

import { Effect } from 'effect'
import { Command, Dom, type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
  execute: Dom.focus('#search-input').pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusSearchInput()),
  ),
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedOpenDialog: () => ({
      model: evo(model, { dialogState: () => 'Open' }),
      commands: [FocusSearchInput()],
    }),
    CompletedFocusSearchInput: () => ({ model }),
  })
