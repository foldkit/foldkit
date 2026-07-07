import { Child } from './child'
import { GotChildMessage } from './message'
import { Model } from './model'

// UPDATE

export const update = (model: Model) => {
  const command = GotChildMessage({ message: Child.Message.ClickedSave() })
  return [model, command]
}
