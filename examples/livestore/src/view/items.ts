import { Array, Match, pipe } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Message } from '../message'
import type { Filter, Model } from '../model'
import type { Items } from '../schema'
import { itemView } from './item'

const filterItems = (items: Items, filter: Filter): Items =>
  Match.value(filter).pipe(
    Match.when('All', () => items),
    Match.when('Active', () =>
      Array.filter(items, ({ isCompleted }) => !isCompleted),
    ),
    Match.when('Completed', () =>
      Array.filter(items, ({ isCompleted }) => isCompleted),
    ),
    Match.exhaustive,
  )

const emptyView = (filter: Filter, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('text-center text-gray-500 py-8')],
    [
      Match.value(filter).pipe(
        Match.when('All', () => 'No tasks yet. Add one above!'),
        Match.when('Active', () => 'No active tasks'),
        Match.when('Completed', () => 'No completed tasks'),
        Match.exhaustive,
      ),
    ],
  )

export const countItems = (
  items: Items,
): Readonly<{ active: number; completed: number }> => {
  const active = pipe(
    items,
    Array.filter(({ isCompleted }) => !isCompleted),
    Array.length,
  )

  return { active, completed: Array.length(items) - active }
}

export const itemsView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const visibleItems = filterItems(model.items, model.filter)

  return Array.match(visibleItems, {
    onEmpty: () => emptyView(model.filter, h),
    onNonEmpty: visibleItems =>
      h.ul(
        [h.Class('space-y-2 mb-6')],
        Array.map(visibleItems, item => itemView(item, h)),
      ),
  })
}
