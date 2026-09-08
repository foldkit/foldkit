import { Html, inertHtml as ih } from 'foldkit/html'

export const arrowRight = (className: string = 'w-5 h-5'): Html =>
  ih.svg(
    [
      ih.AriaHidden(true),
      ih.Class(className),
      ih.Xmlns('http://www.w3.org/2000/svg'),
      ih.Fill('none'),
      ih.ViewBox('0 0 24 24'),
      ih.StrokeWidth('1.5'),
      ih.Stroke('currentColor'),
    ],
    [
      ih.path([
        ih.StrokeLinecap('round'),
        ih.StrokeLinejoin('round'),
        ih.D('M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3'),
      ]),
    ],
  )
