import { Html, inertHtml as ih } from 'foldkit/html'

export const play = (className: string = 'w-5 h-5'): Html =>
  ih.svg(
    [
      ih.AriaHidden(true),
      ih.Class(className),
      ih.Xmlns('http://www.w3.org/2000/svg'),
      ih.Fill('currentColor'),
      ih.ViewBox('0 0 24 24'),
    ],
    [
      ih.path([
        ih.D(
          'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z',
        ),
      ]),
    ],
  )
