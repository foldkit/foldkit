import { DateTime } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'

import * as Button from '@foldkit/ui/button'

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

export const loadingPanel = <Message>(text: string, h: HtmlBuilder<Message>) =>
  h.div(
    [h.Class('bg-white rounded-lg shadow p-6 text-center text-slate-500')],
    [text],
  )

export const errorPanel = <Message>(
  { error, retryMessage }: Readonly<{ error: string; retryMessage: Message }>,
  h: HtmlBuilder<Message>,
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
