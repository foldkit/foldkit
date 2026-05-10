import { Html, html } from 'foldkit/html'

export const squareStack = <ParentMessage>(
  className: string = 'w-5 h-5',
): Html => {
  const h = html<ParentMessage>()

  return h.svg(
    [
      h.AriaHidden(true),
      h.Class(className),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('0 0 24 24'),
      h.StrokeWidth('1.5'),
      h.Stroke('currentColor'),
    ],
    [
      h.path(
        [
          h.StrokeLinecap('round'),
          h.StrokeLinejoin('round'),
          h.D(
            'M6.429 9.75 2.25 12l9.75 5.25 9.75-5.25-4.179-2.25m-11.142 0 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75',
          ),
        ],
        [],
      ),
    ],
  )
}
