import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { Model } from './main'
import { Item } from './schema'

export const buyMilk = Item.make({
  id: 'a',
  text: 'Buy milk',
  completed: false,
  createdAt: 1000,
})

export const walkDog = Item.make({
  id: 'b',
  text: 'Walk the dog',
  completed: false,
  createdAt: 2000,
})

export const doneTask = Item.make({
  id: 'c',
  text: 'Done task',
  completed: true,
  createdAt: 3000,
})

export const modelWithItems = (items: ReadonlyArray<Item>) =>
  Model.make({
    items,
    maybeAddItemError: Option.none(),
    newItemText: '',
    filter: 'All',
  })

export const addItemFailureModel = (
  items: ReadonlyArray<Item>,
  error: string,
) =>
  modifyFields(modelWithItems(items), {
    maybeAddItemError: () => Option.some(error),
  })
