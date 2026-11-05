import { Listbox } from '@foldkit/ui'
import { Message } from './message'
import { Model } from './model'

export const update = (model: Model, message: Message) => {
  const listbox = Listbox.makeBlock()
  return listbox.update(model.sort, message)
}
