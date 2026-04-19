import { Html } from 'foldkit/html'

import { Class, Href, a, div, h1, p } from './html'

export const notFoundView = (
  path: string,
  backLinkHref: string,
  backLinkText: string,
): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4 text-center')],
    [
      h1(
        [Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      p(
        [Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      a(
        [Href(backLinkHref), Class('text-blue-500 hover:underline')],
        [backLinkText],
      ),
    ],
  )
