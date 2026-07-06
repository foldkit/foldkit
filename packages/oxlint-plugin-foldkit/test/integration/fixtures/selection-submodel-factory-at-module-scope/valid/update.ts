import { RadioGroup } from '@foldkit/ui'
import { Message } from './message'
import { Model } from './model'

const sortRadioGroup = RadioGroup.create()

// UPDATE

export const update = (model: Model, message: Message) =>
  sortRadioGroup.update(model.sort, message)
