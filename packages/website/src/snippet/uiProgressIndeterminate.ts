// Pseudocode — omit value for indeterminate progress.
import type { HtmlBuilder } from 'foldkit/html'

import { Progress } from '@foldkit/ui'

const view = (h: HtmlBuilder<Message>) =>
  Progress.view(
    {
      id: 'loading',
      ariaLabel: 'Loading',
      valueText: 'Loading',
      toView: attributes =>
        h.div(
          [
            ...attributes.progress,
            h.Class('h-3 w-full rounded-full bg-gray-200 overflow-hidden'),
          ],
          [
            h.div([
              ...attributes.indicator,
              h.Class('h-full w-1/3 rounded-full bg-blue-600 animate-pulse'),
            ]),
          ],
        ),
    },
    h,
  )
