import { Effect, Option } from 'effect'
import { Command, Task } from 'foldkit'

import { USERNAME_INPUT_ID } from '../../constant'
import { CompletedFocusUsernameInput, Message } from './message'
import { EnterUsername, Model } from './model'

const FocusUsernameInput = Command.define(
  'FocusUsernameInput',
  CompletedFocusUsernameInput,
)

export type InitReturn = [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): InitReturn => [
  {
    homeStep: EnterUsername({ username: '' }),
    formError: Option.none(),
  },
  [
    FocusUsernameInput(
      Task.focus(`#${USERNAME_INPUT_ID}`).pipe(
        Effect.ignore,
        Effect.as(CompletedFocusUsernameInput()),
      ),
    ),
  ],
]
