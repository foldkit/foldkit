import { Html, html } from 'foldkit/html'

export const play = <ParentMessage>(className: string = 'w-5 h-5'): Html => {
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
            'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z',
          ),
        ],
        [],
      ),
    ],
  )
}
