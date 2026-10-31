// ✅ Return the next Model and a Command
import { Effect, Schema } from 'effect'
import { Block, Command, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  OpenedDialog: {},
  CompletedFocusSearchInput: {},
})

const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
})

export class Search extends Block<Search>()('Search', {
  Model: Schema.Struct({ dialogState: Schema.Literals(['Open', 'Closed']) }),
  Message,
  Command: [FocusSearchInput],
}) {}

export const SearchLive = Search.make(
  Effect.fn(function* () {
    return {
      model: { dialogState: 'Closed' },

      update: {
        OpenedDialog: model => ({
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
