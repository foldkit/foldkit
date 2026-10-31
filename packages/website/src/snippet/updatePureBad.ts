// ❌ Don't do this in update
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class Search extends Block<Search>()('Search', {
  Model: Schema.Struct({ dialogState: Schema.Literals(['Open', 'Closed']) }),
  Message: defineMessageUnion({ OpenedDialog: {} }),
}) {}

export const SearchLive = Search.make(
  Effect.fn(function* () {
    return {
      model: { dialogState: 'Closed' },

      update: {
        OpenedDialog: model => {
          document.querySelector<HTMLInputElement>('#search-input')?.focus()
          return { model: modifyFields(model, { dialogState: () => 'Open' }) }
        },
      },
    }
  }),
)
