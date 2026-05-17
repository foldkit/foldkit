import { Html, html } from 'foldkit/html'

import type { Message } from '../message'
import { link, para } from '../prose'

export const view = (path: string, introductionRoute: string): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.h1(
        [h.Class('text-2xl md:text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      para(`The path "${path}" was not found.`),
      link(introductionRoute, '← Go Home'),
    ],
  )
}
