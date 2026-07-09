import { Match as M, Record } from 'effect'
import { Command } from 'foldkit'

import { type Message } from './message'
import type { Model } from './model'

export type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ToggledFaq: ({ id, isOpen }) => [Record.set(model, id, isOpen), []],
    }),
  )
