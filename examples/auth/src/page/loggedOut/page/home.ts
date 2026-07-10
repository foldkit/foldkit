import { Html, html } from 'foldkit/html'

import { loginRouter } from '../../../route'
import type { Message } from '../message'

export const view = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.div(
        [h.Class('text-center py-16 sm:py-20')],
        [
          h.h1(
            [
              h.Class(
                'text-4xl sm:text-6xl font-semibold tracking-tight text-gray-900 mb-6',
              ),
            ],
            ['Welcome to Auth Example'],
          ),
          h.p(
            [h.Class('text-xl text-gray-600 mb-8')],
            [
              'A demonstration of authentication with Submodels and OutMessage in Foldkit.',
            ],
          ),
          h.a(
            [
              h.Href(loginRouter()),
              h.Class(
                'inline-block px-8 py-3 bg-violet-700 text-white font-medium rounded-xl shadow-lg hover:bg-violet-800',
              ),
            ],
            ['Sign In'],
          ),
        ],
      ),
      h.div(
        [h.Class('grid grid-cols-1 md:grid-cols-3 gap-8 mt-16')],
        [
          featureCard(
            'Model as Union',
            'App state is fundamentally LoggedOut | LoggedIn, not a flat struct with optional session.',
          ),
          featureCard(
            'Route Guards',
            'Protected routes redirect to login. Auth routes redirect to dashboard when logged in.',
          ),
          featureCard(
            'Session Persistence',
            'Session survives page refresh via localStorage and the Flags pattern.',
          ),
        ],
      ),
    ],
  )
}

const featureCard = (title: string, description: string): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'bg-white rounded-2xl border border-gray-200/80 shadow-md p-6 text-left',
      ),
    ],
    [
      h.h2([h.Class('text-xl font-semibold text-gray-800 mb-3')], [title]),
      h.p([h.Class('text-gray-600')], [description]),
    ],
  )
}
