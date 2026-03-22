import { Array, Effect, Match as M, Option } from 'effect'
import { Command } from 'foldkit'
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

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      GotLoginMessage: ({ message }) => {
        const [loginModel, commands, maybeOutMessage] = Login.update(
          model.loginModel,
          message,
        )

        const mappedCommands = Array.map(
          commands,
          Command.mapEffect(
            Effect.map(message => GotLoginMessage({ message })),
          ),
        )

        return [
          evo(model, { loginModel: () => loginModel }),
          mappedCommands,
          Option.map(maybeOutMessage, ({ session }) =>
            SucceededLogin({ session }),
          ),
        ]
      },
    }),
  )
