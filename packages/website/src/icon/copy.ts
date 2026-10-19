import { Html, inertHtml as ih } from 'foldkit/html'

export const copy = (className: string = 'w-5 h-5'): Html =>
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
        ih.D(
          'M8 8h10a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2V8Zm8 0V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2',
        ),
      ]),
    ],
  )
