import { Html } from 'foldkit/html'

import { Session } from '../../../domain/session'
import { Class, div, h1, h2, p } from '../../../html'

export const view = (session: Session): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1(
        [Class('text-4xl font-bold text-gray-800 mb-6')],
        [`Welcome back, ${session.name}!`],
      ),
      p([Class('text-lg text-gray-600 mb-8')], ['Here is your dashboard.']),
      div(
        [Class('grid grid-cols-1 md:grid-cols-3 gap-6')],
        [
          statCard('Total Sessions', '42'),
          statCard('Active Projects', '7'),
          statCard('Tasks Completed', '128'),
        ],
      ),
    ],
  )

const statCard = (title: string, value: string): Html =>
  div(
    [Class('bg-white rounded-lg shadow-md p-6')],
    [
      h2([Class('text-sm font-medium text-gray-500 uppercase mb-1')], [title]),
      p([Class('text-3xl font-bold text-gray-800')], [value]),
    ],
  )
