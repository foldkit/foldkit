import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { Items } from './domain'
import { Model } from './model'

export const buyMilk = Items.Item.make({
  id: 'a',
  text: 'Buy milk',
  isCompleted: false,
  createdAt: 1000,
})

export const walkDog = Items.Item.make({
  id: 'b',
  text: 'Walk the dog',
  isCompleted: false,
  createdAt: 2000,
})

export const doneTask = Items.Item.make({
  id: 'c',
  text: 'Done task',
  isCompleted: true,
  createdAt: 3000,
})

export const modelWithItems = (items: ReadonlyArray<Items.Item>) =>
  Model.make({
    items,
    maybeAddItemError: Option.none(),
    newItemText: '',
    filter: 'All',
  })

export const addItemFailureModel = (
  items: ReadonlyArray<Items.Item>,
  error: string,
) =>
  modifyFields(modelWithItems(items), {
    maybeAddItemError: () => Option.some(error),
  })
