// ❌ Bad: update performs a DOM effect during the state transition.

import { modifyFields } from 'foldkit/struct'

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedOpenDialog: () => {
      document.querySelector<HTMLInputElement>('#search-input')?.focus()

      return { model: modifyFields(model, { dialogState: () => 'Open' }) }
    },
  }),
)
