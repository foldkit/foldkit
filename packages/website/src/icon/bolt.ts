import { Html, inertHtml as ih } from 'foldkit/html'

export const bolt = (className: string = 'w-5 h-5'): Html =>
  ih.svg(
    [
      ih.AriaHidden(true),
      ih.Class(className),
      ih.Xmlns('http://www.w3.org/2000/svg'),
      ih.Fill('none'),
      ih.ViewBox('2 2 20 20'),
      ih.StrokeWidth('1.5'),
      ih.Stroke('currentColor'),
    ],
    [
      ih.path([
        ih.StrokeLinecap('round'),
        ih.StrokeLinejoin('round'),
        ih.D('m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z'),
      ]),
    ],
  )
