// ❌ Bad: update performs a DOM effect during the state transition.

import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class SearchDialog extends Block<SearchDialog>()('SearchDialog', {
  Model: Schema.Struct({ dialogState: Schema.Literals(['Closed', 'Open']) }),
  Message: defineMessageUnion({ ClickedOpenDialog: {} }),
}) {}

export const SearchDialogLive = SearchDialog.toLayer(() => ({
  init: () => ({ dialogState: 'Closed' }),

  update: {
    ClickedOpenDialog: model => {
      document.querySelector<HTMLInputElement>('#search-input')?.focus()

      return { model: modifyFields(model, { dialogState: () => 'Open' }) }
    },
  },
}))
