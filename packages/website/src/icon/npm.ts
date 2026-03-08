import { Html } from 'foldkit/html'

import { AriaHidden, Class, D, Fill, ViewBox, path, svg } from '../html'

export const npm = (className = 'w-5 h-5'): Html =>
  svg(
    [AriaHidden(true), Class(className), ViewBox('0 0 780 250'), Fill('currentColor')],
    [
      path(
        [
          D(
            'M240,250h100v-50h100V0H240V250z M340,50h50v100h-50V50z M480,0v200h100V50h50v150h50V50h50v150h50V0H480z M0,200h100V50h50v150h50V0H0V200z',
          ),
        ],
        [],
      ),
    ],
  )
