import { type Html, inertHtml as ih } from 'foldkit/html'

import { link, para } from '../prose'

export const view = (path: string, introductionRoute: string): Html =>
  ih.div(
    [],
    [
      ih.h1(
        [ih.Class('text-2xl md:text-4xl font-bold text-red-600 mb-6')],
        ['404 | Page Not Found'],
      ),
      para(`The path "${path}" was not found.`),
      link(introductionRoute, '← Go Home'),
    ],
  )
