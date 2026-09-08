import { Listbox as Selection } from '@foldkit/ui'
import { Message } from './message'
import { Model } from './model'

// UPDATE

export const update = (model: Model, message: Message) => {
  const listbox = Selection.create()
  return listbox.update(model.sort, message)
}
