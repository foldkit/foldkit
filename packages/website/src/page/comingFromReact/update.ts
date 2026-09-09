import { Record } from 'effect'
import { type Update } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

export type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ToggledFaq: ({ id, isOpen }) => ({ model: Record.set(model, id, isOpen) }),
  })
