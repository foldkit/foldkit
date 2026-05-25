import { Html, html } from 'foldkit/html'

import { Session } from '../../../domain/session'
import { ClickedLogout, type Message } from '../message'

// VIEW

const infoRow = (label: string, value: string): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'flex justify-between items-center py-2 border-b border-gray-100',
      ),
    ],
    [
      h.p([h.Class('text-gray-600')], [label]),
      h.p([h.Class('font-medium text-gray-800')], [value]),
    ],
  )
}

export const view = (session: Session): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1([h.Class('text-4xl font-bold text-gray-800 mb-6')], ['Settings']),
      h.div(
        [h.Class('bg-white rounded-lg shadow-md p-6 mb-6')],
        [
          h.h2(
            [h.Class('text-xl font-semibold text-gray-800 mb-4')],
            ['Account Information'],
          ),
          h.div(
            [h.Class('space-y-4')],
            [
              infoRow('User ID', session.userId),
              infoRow('Email', session.email),
              infoRow('Name', session.name),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('bg-white rounded-lg shadow-md p-6')],
        [
          h.h2(
            [h.Class('text-xl font-semibold text-gray-800 mb-4')],
            ['Actions'],
          ),
          h.button(
            [
              h.OnClick(ClickedLogout()),
              h.Class(
                'px-6 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition cursor-pointer',
              ),
            ],
            ['Sign Out'],
          ),
        ],
      ),
    ],
  )
}
