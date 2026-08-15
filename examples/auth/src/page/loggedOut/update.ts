import { Match as M, Option } from 'effect'
import { Command, Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  GotLoginMessage,
  Message,
  type OutMessage,
  SucceededLogin,
} from './message'
import { Model } from './model'
import * as Login from './page/login'

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const foldLogin = Update.foldChild({
  update: Login.update,
  read: (model: Model) => Option.some(model.loginModel),
  write: (model, nextLoginModel) =>
    evo(model, { loginModel: () => nextLoginModel }),
  toParentMessage: message => GotLoginMessage({ message }),
  toParentOutMessage: M.type<Login.OutMessage>().pipe(
    M.tagsExhaustive({
      SucceededLogin: ({ session }) => Option.some(SucceededLogin({ session })),
    }),
  ),
})

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      GotLoginMessage: ({ message }) => foldLogin(model, message),
    }),
  )
