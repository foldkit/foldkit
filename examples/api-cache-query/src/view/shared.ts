import { DateTime } from 'effect'

import * as Button from '@foldkit/ui/button'

import type { ApplicationViewBuilder } from '../composition'
import { Message } from '../message'

export const formatFetchedAt = (fetchedAt: number): string =>
  DateTime.formatUtc(DateTime.makeUnsafe(fetchedAt), {
    locale: 'en-US',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  })

export const toolbarButtonClassName =
  'px-3 py-1.5 bg-white text-slate-700 text-sm font-semibold rounded-md shadow hover:bg-slate-50 transition cursor-pointer data-[disabled]:opacity-50 data-[disabled]:cursor-default data-[disabled]:hover:bg-white'

export const statCard = (
  { label, value }: Readonly<{ label: string; value: string }>,
  h: ApplicationViewBuilder,
) =>
  h.div(
    [h.Class('bg-white rounded-xl shadow p-4 flex flex-col gap-1')],
    [
      h.div([h.Class('text-sm text-slate-500')], [label]),
      h.div([h.Class('text-2xl font-bold text-slate-900')], [value]),
    ],
  )

export const loadingPanel = (text: string, h: ApplicationViewBuilder) =>
  h.div(
    [h.Class('bg-white rounded-lg shadow p-6 text-center text-slate-500')],
    [text],
  )

export const errorPanel = (
  { error, retryMessage }: Readonly<{ error: string; retryMessage: Message }>,
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
