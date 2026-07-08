import { Listbox } from '@foldkit/ui'
import { Message } from './message'
import { Model } from './model'

// UPDATE

export const update = (model: Model, message: Message) => {
  const listbox = Listbox.create()
  return listbox.update(model.sort, message)
}
