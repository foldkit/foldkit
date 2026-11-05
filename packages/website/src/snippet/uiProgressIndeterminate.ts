import type { HtmlBuilder } from 'foldkit/html'

import { Progress } from '@foldkit/ui'

const view = (h: HtmlBuilder<Message>) => {
  const progressView = (attributes: Progress.ProgressAttributes<Message>) =>
    h.div(
      [h.Class('flex flex-col gap-2')],
      [
        h.span([...attributes.label], ['Loading']),
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
      ],
    )

  return Progress.view(
    {
      id: 'loading',
      valueText: 'Loading',
      toView: progressView,
    },
    h,
  )
}
