import { Html, html } from 'foldkit/html'

export const pause = <ParentMessage>(className: string = 'w-5 h-5'): Html => {
  const h = html<ParentMessage>()

  return h.svg(
    [
      h.AriaHidden(true),
      h.Class(className),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('currentColor'),
      h.ViewBox('0 0 24 24'),
    ],
    [
      h.path(
        [
          h.D(
            'M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z',
          ),
        ],
        [],
      ),
    ],
  )
}
