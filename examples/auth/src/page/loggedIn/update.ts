import { Match as M, Option } from 'effect'

import { Message, type OutMessage, RequestedLogout } from './message'
import { Model } from './model'

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<never>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedLogout: () => [model, [], Option.some(RequestedLogout())],
    }),
  )
