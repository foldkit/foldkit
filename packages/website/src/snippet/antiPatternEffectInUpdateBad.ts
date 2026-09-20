// ❌ Bad: update performs a DOM effect during the state transition.

import type { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedOpenDialog: () => {
      document.querySelector<HTMLInputElement>('#search-input')?.focus()

      return { model: modifyFields(model, { dialogState: () => 'Open' }) }
    },
  })
