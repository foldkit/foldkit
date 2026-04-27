import { Html } from 'foldkit/html'

import { Class, div, h1 } from '../html'
import { link, para } from '../prose'

export const view = (path: string, introductionRoute: string): Html =>
  div(
    [],
    [
      h1(
        [Class('text-2xl md:text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      para(`The path "${path}" was not found.`),
      link(introductionRoute, '← Go Home'),
    ],
  )
