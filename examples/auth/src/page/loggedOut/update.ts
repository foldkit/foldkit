import { Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Message, OutMessage } from './message'
import { Model } from './model'
import * as Login from './page/login'

const foldLogin = Update.foldChild({
  update: Login.update,
  read: (model: Model) => Option.some(model.loginModel),
  write: (model, nextLoginModel) =>
    evo(model, { loginModel: () => nextLoginModel }),
  toParentMessage: message => Message.GotLoginMessage({ message }),
  toParentOutMessage: Login.OutMessage.match<OutMessage>({
    SucceededLogin: ({ session }) => OutMessage.SucceededLogin({ session }),
  }),
})

export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      GotLoginMessage: ({ message }) => foldLogin(model, message),
    },
  )
