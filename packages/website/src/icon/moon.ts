import { Html, html } from 'foldkit/html'

export const moon = <ParentMessage>(className = 'w-5 h-5'): Html => {
  const h = html<ParentMessage>()

  return h.svg(
    [
      h.AriaHidden(true),
      h.Class(className),
      h.ViewBox('0 0 24 24'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.5'),
    ],
    [
      h.path(
        [
          h.StrokeLinecap('round'),
          h.StrokeLinejoin('round'),
          h.D(
            'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z',
          ),
        ],
        [],
      ),
    ],
  )
}
