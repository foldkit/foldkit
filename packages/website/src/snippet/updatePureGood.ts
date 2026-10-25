import { Effect } from 'effect'
import { Dom } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import type { Model } from './model'

const FocusSearchInput = ApplicationDefinition.makeCommand('FocusSearchInput', {
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
const update = ApplicationComposition.makeUpdate({
  OpenedDialog: model => ({
    model: modifyFields(model, { dialogState: () => 'Open' }),
    commands: [FocusSearchInput()],
  }),
  CompletedFocusSearchInput: model => ({ model }),
})
