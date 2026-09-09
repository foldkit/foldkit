import { Html, inertHtml as ih } from 'foldkit/html'

export const menu = (className: string = 'w-6 h-6'): Html =>
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
        ih.D('M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'),
      ]),
    ],
  )
