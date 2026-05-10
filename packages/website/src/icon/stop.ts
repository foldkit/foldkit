import { Html, html } from 'foldkit/html'

export const stop = <ParentMessage>(className: string = 'w-5 h-5'): Html => {
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
            'M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z',
          ),
        ],
        [],
      ),
    ],
  )
}
