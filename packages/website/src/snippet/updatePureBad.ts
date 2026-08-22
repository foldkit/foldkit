import { type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Message } from './message'
import type { Model } from './model'

type UpdateReturn = Update.Return<Model, Message>

// ❌ Don't do this in update
const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    OpenedDialog: () => {
      document.querySelector<HTMLInputElement>('#search-input')?.focus()
      return { model: evo(model, { dialogState: () => 'Open' }) }
    },
  })
