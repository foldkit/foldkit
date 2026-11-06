import type { HtmlBuilder } from 'foldkit/html'

import { Progress } from '@foldkit/ui'

const view = (h: HtmlBuilder<Message>) => {
  const progressView = (attributes: Progress.ProgressAttributes<Message>) =>
    h.div(
      [h.Class('flex flex-col gap-2')],
      [
        h.span([...attributes.label], ['Upload']),
        h.div(
          [
            ...attributes.progress,
            h.Class('h-3 w-full rounded-full bg-gray-200'),
          ],
          [
            h.div(
              [...attributes.track, h.Class('h-full w-full overflow-hidden')],
              [
                h.div([
                  ...attributes.indicator,
                  h.Class('h-full rounded-full bg-blue-600'),
                ]),
              ],
            ),
          ],
        ),
      ],
    )

  return Progress.view(
    {
      id: 'upload',
      value: 42,
      max: 100,
      valueText: '42 percent',
      toView: progressView,
    },
    h,
  )
}
