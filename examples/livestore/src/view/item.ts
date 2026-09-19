import clsx from 'clsx'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button, Checkbox } from '@foldkit/ui'

import { Message } from '../message'
import type { Item } from '../schema'

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

export const itemView = (item: Item, h: HtmlBuilder<Message>): Html =>
  h.keyed('li')(
    item.id,
    [h.Class('flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg group')],
    [itemCheckboxView(item, h), deleteItemButtonView(item, h)],
  )
