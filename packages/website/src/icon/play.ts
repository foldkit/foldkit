import { Html } from 'foldkit/html'

import { AriaHidden, Class, D, Fill, ViewBox, Xmlns, path, svg } from '../html'

export const play = (className: string = 'w-5 h-5'): Html =>
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
            'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z',
          ),
        ],
        [],
      ),
    ],
  )
