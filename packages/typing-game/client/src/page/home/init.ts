import { Option } from 'effect'

import { FocusUsernameInput } from './command'
import { HomeStep, Model } from './model'

export const init = () => ({
  model: Model.make({
    homeStep: HomeStep.EnterUsername({ username: '' }),
    formError: Option.none(),
  }),
  commands: [FocusUsernameInput()],
})
