import * as Button from '@foldkit/ui/button'

import type { ApplicationViewBuilder } from '../composition'
import type { Message } from '../message'

export const toolbarButtonClassName =
  'px-3 py-1.5 bg-white text-slate-700 text-sm font-semibold rounded-md shadow hover:bg-slate-50 transition cursor-pointer data-[disabled]:opacity-50 data-[disabled]:cursor-default data-[disabled]:hover:bg-white'

export const headerView = (h: ApplicationViewBuilder) =>
  h.header(
    [h.Class('flex flex-col gap-1')],
    [
      h.h1([h.Class('text-3xl font-bold text-slate-900')], ['API Cache']),
      h.p(
        [h.Class('text-slate-600')],
        [
          'Query client patterns written as ordinary Model state, update logic, and one Subscription.',
        ],
      ),
    ],
  )

export const loadingPanel = (text: string, h: ApplicationViewBuilder) =>
  h.div(
    [h.Class('bg-white rounded-lg shadow p-6 text-center text-slate-500')],
    [text],
  )

type ErrorPanelInput = Readonly<{
  error: string
  retryMessage: Message
}>

export const errorPanel = (
  { error, retryMessage }: ErrorPanelInput,
  h: ApplicationViewBuilder,
) =>
  h.div(
    [
      h.Class(
        'bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center justify-between gap-4',
      ),
    ],
    [
      h.p([], [error]),
      Button.view(
        {
          onClick: retryMessage,
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'shrink-0 px-3 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700 transition cursor-pointer',
                ),
              ],
              ['Retry'],
            ),
        },
        h,
      ),
    ],
  )
