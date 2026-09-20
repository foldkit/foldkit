import { Effect } from 'effect'
import { Command, Dom, type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import type { Model } from './model'

const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
  execute: Dom.focus('#search-input').pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusSearchInput()),
  ),
})

// ✅ Return the next Model and a Command
const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    OpenedDialog: () => ({
      model: modifyFields(model, { dialogState: () => 'Open' }),
      commands: [FocusSearchInput()],
    }),
    CompletedFocusSearchInput: () => ({ model }),
  })
