import { Html } from 'foldkit/html'

import { AriaHidden, Class, D, Fill, ViewBox, Xmlns, path, svg } from '../html'

export const stop = (className: string = 'w-5 h-5'): Html =>
  svg(
    [
      AriaHidden(true),
      Class(className),
      Xmlns('http://www.w3.org/2000/svg'),
      Fill('currentColor'),
      ViewBox('0 0 24 24'),
    ],
    [
      path(
        [
          D(
            'M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z',
          ),
        ],
        [],
      ),
    ],
  )
