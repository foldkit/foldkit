import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import type { Message } from './main'

export const retryButton = (
  retryMessage: Message,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick: retryMessage,
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Class(
              'shrink-0 cursor-pointer rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
            ),
          ],
          ['Retry'],
        ),
    },
    h,
  )
