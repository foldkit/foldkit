import { Option } from 'effect'

import { Command, FocusUsernameInput } from './command'
import { EnterUsername, Model } from './model'

export type InitReturn = [Model, ReadonlyArray<Command>]

export const init = (): InitReturn => [
  {
    homeStep: EnterUsername({ username: '' }),
    formError: Option.none(),
  },
  [FocusUsernameInput()],
]
