import { Match as M, Option } from 'effect'
import { Command } from 'foldkit'

import { Message, type OutMessage, RequestedLogout } from './message'
import { Model } from './model'

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.tagsExhaustive({
      GotSettingsMessage: ({ message }) =>
        M.value(message).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            ClickedLogout: () => [model, [], Option.some(RequestedLogout())],
          }),
        ),
    }),
  )
