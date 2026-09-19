import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Item, Model } from './main'

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

export const successModel = (items: ReadonlyArray<Item>): Model =>
  Model.make({
    itemsAsyncData: AsyncData.Success({ data: items }),
    maybeMutationError: Option.none(),
    newItemText: '',
    filter: 'All',
  })

export const mutationFailureModel = (
  items: ReadonlyArray<Item>,
  error: string,
): Model =>
  modifyFields(successModel(items), {
    maybeMutationError: () => Option.some(error),
  })

export const loadingModel: Model = Model.make({
  itemsAsyncData: AsyncData.Loading(),
  maybeMutationError: Option.none(),
  newItemText: '',
  filter: 'All',
})

export const failureModel: Model = Model.make({
  itemsAsyncData: AsyncData.Failure({ error: 'LiveStore is unavailable' }),
  maybeMutationError: Option.none(),
  newItemText: '',
  filter: 'All',
})

export const staleModel = (items: ReadonlyArray<Item>, error: string): Model =>
  Model.make({
    itemsAsyncData: AsyncData.Stale({ data: items, error }),
    maybeMutationError: Option.none(),
    newItemText: '',
    filter: 'All',
  })
