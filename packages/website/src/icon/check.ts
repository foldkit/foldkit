import { Html } from 'foldkit/html'

import {
  AriaHidden,
  Class,
  D,
  Fill,
  Stroke,
  StrokeLinecap,
  StrokeLinejoin,
  StrokeWidth,
  ViewBox,
  Xmlns,
  path,
  svg,
} from '../html'

export const check = (className: string = 'w-6 h-6'): Html =>
  svg(
    [
      AriaHidden(true),
      Class(className),
      Xmlns('http://www.w3.org/2000/svg'),
      Fill('none'),
      ViewBox('0 0 24 24'),
      StrokeWidth('2'),
      Stroke('currentColor'),
    ],
    [
      path(
        [
          StrokeLinecap('round'),
          StrokeLinejoin('round'),
          D('M4.5 12.75l6 6 9-13.5'),
        ],
        [],
      ),
    ],
  )
