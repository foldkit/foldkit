import clsx from 'clsx'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { Message } from '../message'
import type { Filter } from '../model'

const filterButtonView = (
  selectedFilter: Filter,
  filter: Filter,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick: Message.SelectedFilter({ filter }),
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.AriaPressed(selectedFilter === filter ? 'true' : 'false'),
            h.Class(
              clsx('px-3 py-1 rounded', {
                'bg-blue-500 text-white': selectedFilter === filter,
                'bg-gray-200 text-gray-700 hover:bg-gray-300':
                  selectedFilter !== filter,
              }),
            ),
          ],
          [filter],
        ),
    },
    h,
  )

const filterControlsView = (filter: Filter, h: HtmlBuilder<Message>): Html =>
  h.nav(
    [h.AriaLabel('Task filters'), h.Class('flex justify-center gap-2')],
    [
      filterButtonView(filter, 'All', h),
      filterButtonView(filter, 'Active', h),
      filterButtonView(filter, 'Completed', h),
    ],
  )

const clearCompletedButtonView = (
  completedCount: number,
  h: HtmlBuilder<Message>,
): Html => {
  if (completedCount === 0) {
    return h.empty
  }

  return h.div(
    [h.Class('flex justify-center')],
    [
      Button.view(
        {
          onClick: Message.ClickedClearCompleted(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200',
                ),
              ],
              [`Clear ${completedCount} completed`],
            ),
        },
        h,
      ),
    ],
  )
}

export const footerView = (
  filter: Filter,
  activeCount: number,
  completedCount: number,
  h: HtmlBuilder<Message>,
): Html =>
  h.footer(
    [h.Class('flex flex-col gap-4')],
    [
      h.div(
        [h.Class('text-sm text-gray-600 text-center'), h.Role('status')],
        [`${activeCount} active, ${completedCount} completed`],
      ),
      filterControlsView(filter, h),
      clearCompletedButtonView(completedCount, h),
    ],
  )
