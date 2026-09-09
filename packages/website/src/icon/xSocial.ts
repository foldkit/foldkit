import { Html, inertHtml as ih } from 'foldkit/html'

export const xSocial = (className = 'w-5 h-5'): Html =>
  ih.svg(
    [
      ih.AriaHidden(true),
      ih.Class(className),
      ih.ViewBox('0 0 24 24'),
      ih.Fill('currentColor'),
    ],
    [
      ih.path([
        ih.D(
          'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
        ),
      ]),
    ],
  )
