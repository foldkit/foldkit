import { Listbox } from '@foldkit/ui'
import { Message } from './message'
import { Model } from './model'

const sortListbox = Listbox.makeBlock()

// UPDATE

export const update = (model: Model, message: Message) =>
  sortListbox.update(model.sort, message)

export const createLocalSelection = (Listbox: { makeBlock: () => unknown }) =>
  Listbox.makeBlock()
