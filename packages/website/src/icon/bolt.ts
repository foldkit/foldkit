import { Html, html } from 'foldkit/html'

export const bolt = <ParentMessage>(className: string = 'w-5 h-5'): Html => {
  const h = html<ParentMessage>()

  return h.svg(
    [
      h.AriaHidden(true),
      h.Class(className),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('2 2 20 20'),
      h.StrokeWidth('1.5'),
      h.Stroke('currentColor'),
    ],
    [
      h.path(
        [
          h.StrokeLinecap('round'),
          h.StrokeLinejoin('round'),
          h.D('m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z'),
        ],
        [],
      ),
    ],
  )
}
