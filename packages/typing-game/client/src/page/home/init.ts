import { Option } from 'effect'
import { Command } from 'foldkit'

import { Message } from './message'
import { EnterUsername, Model } from './model'

export type InitReturn = [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): InitReturn => [
  {
    homeStep: EnterUsername({ username: '' }),
    formError: Option.none(),
  },
  [],
]
