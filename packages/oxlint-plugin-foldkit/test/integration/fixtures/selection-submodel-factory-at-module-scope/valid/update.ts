import { Listbox } from '@foldkit/ui'
import { Message } from './message'
import { Model } from './model'

const sortListbox = Listbox.create()

// UPDATE

export const update = (model: Model, message: Message) =>
  sortListbox.update(model.sort, message)
