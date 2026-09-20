import { type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import type { Model } from './model'

// ❌ Don't do this in update
const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    OpenedDialog: () => {
      document.querySelector<HTMLInputElement>('#search-input')?.focus()
      return { model: modifyFields(model, { dialogState: () => 'Open' }) }
    },
  })
