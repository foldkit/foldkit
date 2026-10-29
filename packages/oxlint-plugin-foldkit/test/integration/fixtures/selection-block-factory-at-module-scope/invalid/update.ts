import * as Selection from '@foldkit/ui/listbox'
import { Message } from './message'
import { Model } from './model'

// UPDATE

export const update = (model: Model, message: Message) => {
  const listbox = Selection.makeBlock()
  return listbox.update(model.sort, message)
}
