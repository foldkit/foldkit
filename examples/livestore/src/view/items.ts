import clsx from 'clsx'
import { Array, Match, pipe } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button, Checkbox } from '@foldkit/ui'

import { Message } from '../message'
import type { Filter, Model } from '../model'
import type { Item, Items } from '../schema'

const checkboxBoxClassName = (isChecked: boolean): string =>
  clsx(
    'flex h-4 w-4 items-center justify-center rounded border transition cursor-pointer',
    {
      'border-blue-600 bg-blue-600': isChecked,
      'border-gray-300': !isChecked,
    },
  )

const itemCheckboxView = (item: Item, h: HtmlBuilder<Message>): Html =>
  Checkbox.view(
    {
      id: `item-${item.id}`,
      isChecked: item.isCompleted,
      onToggle: () => Message.ToggledItem({ id: item.id }),
      toView: attributes =>
        h.div(
          [h.Class('flex flex-1 items-center gap-3')],
          [
            h.div(
              [
                ...attributes.checkbox,
                h.Class(checkboxBoxClassName(item.isCompleted)),
              ],
              item.isCompleted
                ? [h.span([h.Class('text-white text-xs')], ['✓'])]
                : [],
            ),
            h.span(
              [
                ...attributes.label,
                h.Class(
                  clsx('flex-1', {
                    'line-through text-gray-500': item.isCompleted,
                    'text-gray-900': !item.isCompleted,
                  }),
                ),
              ],
              [item.text],
            ),
          ],
        ),
    },
    h,
  )

const deleteItemButtonView = (item: Item, h: HtmlBuilder<Message>): Html =>
  Button.view(
    {
      onClick: Message.ClickedDeleteItem({ id: item.id }),
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.AriaLabel(`Delete ${item.text}`),
            h.Class(
              'px-2 py-1 text-red-600 rounded hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 hover-capable:opacity-0 hover-capable:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity',
            ),
          ],
          ['×'],
        ),
    },
    h,
  )

const itemView = (item: Item, h: HtmlBuilder<Message>): Html =>
  h.keyed('li')(
    item.id,
    [h.Class('flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg group')],
    [itemCheckboxView(item, h), deleteItemButtonView(item, h)],
  )

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

export const countItemsByCompletion = (
  items: Items,
): Readonly<{ activeCount: number; completedCount: number }> => {
  const activeCount = pipe(
    items,
    Array.filter(({ isCompleted }) => !isCompleted),
    Array.length,
  )

  return {
    activeCount,
    completedCount: Array.length(items) - activeCount,
  }
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
