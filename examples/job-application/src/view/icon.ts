import { type Html, html } from 'foldkit/html'

export const chevronDown = (className: string = 'w-4 h-4'): Html => {
  const h = html()

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
          h.D('M19.5 8.25l-7.5 7.5-7.5-7.5'),
        ],
        [],
      ),
    ],
  )
}
