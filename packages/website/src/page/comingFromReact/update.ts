import { Record } from 'effect'
import { Update } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ToggledFaq: ({ id, isOpen }) => ({ model: Record.set(model, id, isOpen) }),
  }),
)
