import { Html } from 'foldkit/html'

import { AriaHidden, Class, D, Fill, ViewBox, Xmlns, path, svg } from '../html'

export const pause = (className: string = 'w-5 h-5'): Html =>
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
            'M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z',
          ),
        ],
        [],
      ),
    ],
  )
