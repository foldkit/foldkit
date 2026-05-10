import { Html, html } from 'foldkit/html'

export const check = <ParentMessage>(className: string = 'w-6 h-6'): Html => {
  const h = html<ParentMessage>()

  return h.svg(
    [
      h.AriaHidden(true),
      h.Class(className),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('0 0 24 24'),
      h.StrokeWidth('2'),
      h.Stroke('currentColor'),
    ],
    [
      h.path(
        [
          h.StrokeLinecap('round'),
          h.StrokeLinejoin('round'),
          h.D('M4.5 12.75l6 6 9-13.5'),
        ],
        [],
      ),
    ],
  )
}
