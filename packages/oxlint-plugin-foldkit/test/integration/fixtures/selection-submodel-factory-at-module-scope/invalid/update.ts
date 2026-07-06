import { RadioGroup } from '@foldkit/ui'
import { Message } from './message'
import { Model } from './model'

// UPDATE

export const update = (model: Model, message: Message) => {
  const radioGroup = RadioGroup.create()
  return radioGroup.update(model.sort, message)
}
