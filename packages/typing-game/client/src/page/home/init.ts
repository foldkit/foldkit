import { Layer, Option } from 'effect'
import { type Update } from 'foldkit'

import { CommandsLayer, FocusUsernameInput } from './command'
import { Message } from './message'
import { HomeStep, Model } from './model'

export type InitReturn = Update.Return<
  Model,
  Message,
  Layer.Success<typeof CommandsLayer>
>

export const init = (): InitReturn => ({
  model: {
    homeStep: HomeStep.EnterUsername({ username: '' }),
    formError: Option.none(),
  },
  commands: [FocusUsernameInput()],
})
