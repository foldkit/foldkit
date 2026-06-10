import { Array, Effect, Match as M, Option, Schema as S } from 'effect'
import { DataCommand } from 'foldkit'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

import {
  GotLoginMessage,
  Message,
  type OutMessage,
  SucceededLogin,
} from './message'
import { Model } from './model'
import * as Login from './page/login'

// COMMAND

export const LiftLogin = ts('LiftLogin', { command: Login.Command })

export const Command = S.Union([LiftLogin])
export type Command = typeof Command.Type

export const execute = (command: Command): Effect.Effect<Message> =>
  M.value(command).pipe(
    M.tagsExhaustive({
      LiftLogin: ({ command }) =>
        DataCommand.delegate(Login.execute, message =>
          GotLoginMessage({ message }),
        )(command),
    }),
  )

// UPDATE

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command>,
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

        const liftedCommands = Array.map(commands, command =>
          LiftLogin({ command }),
        )

        return [
          evo(model, { loginModel: () => loginModel }),
          liftedCommands,
          Option.map(maybeOutMessage, ({ session }) =>
            SucceededLogin({ session }),
          ),
        ]
      },
    }),
  )
