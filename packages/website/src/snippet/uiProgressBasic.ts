// Pseudocode — Progress is view-only. Use determinate when value is known.
import type { HtmlBuilder } from 'foldkit/html'

import { Progress } from '@foldkit/ui'

const view = (h: HtmlBuilder<Message>) =>
  Progress.view(
    {
      id: 'upload',
      value: 42,
      max: 100,
      ariaLabel: 'Upload',
      valueText: '42 percent',
      toView: attributes =>
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
    },
    h,
  )
