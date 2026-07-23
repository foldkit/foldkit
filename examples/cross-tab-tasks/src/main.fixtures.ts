import { AsyncData } from 'foldkit'

import type { Model } from './main'

export const buyMilk = {
  id: 'a',
  text: 'Buy milk',
  completed: false,
  createdAt: 1000,
}

export const walkDog = {
  id: 'b',
  text: 'Walk the dog',
  completed: false,
  createdAt: 2000,
}

export const doneTask = {
  id: 'c',
  text: 'Done task',
  completed: true,
  createdAt: 3000,
}

export const readyModel = (items: ReadonlyArray<typeof buyMilk>): Model => ({
  items: AsyncData.Success({ data: items }),
  newItemText: '',
  filter: 'All',
})

export const loadingModel: Model = {
  items: AsyncData.Loading(),
  newItemText: '',
  filter: 'All',
}

export const failedModel: Model = {
  items: AsyncData.Failure({ error: 'IndexedDB is unavailable' }),
  newItemText: '',
  filter: 'All',
}

export const staleModel = (
  items: ReadonlyArray<typeof buyMilk>,
  error: string,
): Model => ({
  items: AsyncData.Stale({ data: items, error }),
  newItemText: '',
  filter: 'All',
})
