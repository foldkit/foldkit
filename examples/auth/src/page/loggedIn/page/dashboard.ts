import { Html, html } from 'foldkit/html'

import { Session } from '../../../domain/session'
import type { Message } from '../message'

export const view = (session: Session): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-gray-800 mb-6')],
        [`Welcome back, ${session.name}!`],
      ),
      h.p([h.Class('text-lg text-gray-600 mb-8')], ['Here is your dashboard.']),
      h.div(
        [h.Class('grid grid-cols-1 md:grid-cols-3 gap-6')],
        [
          statCard('Total Sessions', '42'),
          statCard('Active Projects', '7'),
          statCard('Tasks Completed', '128'),
        ],
      ),
    ],
  )
}

const statCard = (title: string, value: string): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('bg-white rounded-lg shadow-md p-6')],
    [
      h.h2(
        [h.Class('text-sm font-medium text-gray-500 uppercase mb-1')],
        [title],
      ),
      h.p([h.Class('text-3xl font-bold text-gray-800')], [value]),
    ],
  )
}
