// ✅ Good: update returns a Command and the Runtime performs the effect.

import { Effect, Schema } from 'effect'
import { Block, Command, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedOpenDialog: {},
  CompletedFocusSearchInput: {},
})

const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
})

export class SearchDialog extends Block<SearchDialog>()('SearchDialog', {
  Model: Schema.Struct({ dialogState: Schema.Literals(['Closed', 'Open']) }),
  Message,
  Command: [FocusSearchInput],
}) {}

export const SearchDialogLive = SearchDialog.make(
  Effect.fn(function* () {
    return {
      model: { dialogState: 'Closed' },

      update: {
        ClickedOpenDialog: model => ({
          model: modifyFields(model, { dialogState: () => 'Open' }),
          commands: [FocusSearchInput()],
        }),
        CompletedFocusSearchInput: model => ({ model }),
      },

      commands: {
        FocusSearchInput: () =>
          Dom.focus('#search-input').pipe(
            Effect.ignore,
            Effect.as(Message.CompletedFocusSearchInput()),
          ),
      },
    }
  }),
)
