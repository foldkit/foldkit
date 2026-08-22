import { Match as M, Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Message, OutMessage } from './message'
import { Model } from './model'
import * as Login from './page/login'

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const foldLogin = Update.foldChild({
  update: Login.update,
  read: (model: Model) => Option.some(model.loginModel),
  write: (model, nextLoginModel) =>
    evo(model, { loginModel: () => nextLoginModel }),
  toParentMessage: message => Message.GotLoginMessage({ message }),
  toParentOutMessage: M.type<Login.OutMessage>().pipe(
    M.tagsExhaustive({
      SucceededLogin: ({ session }) => OutMessage.SucceededLogin({ session }),
    }),
  ),
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotLoginMessage: ({ message }) => foldLogin(model, message),
  })
