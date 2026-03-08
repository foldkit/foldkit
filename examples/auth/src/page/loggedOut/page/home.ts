import { Html } from 'foldkit/html'

import { Class, Href, a, div, h1, h2, p } from '../../../html'
import { loginRouter } from '../../../route'

export const view = (): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      div(
        [Class('text-center py-16')],
        [
          h1(
            [Class('text-5xl font-bold text-gray-800 mb-6')],
            ['Welcome to Auth Example'],
          ),
          p(
            [Class('text-xl text-gray-600 mb-8')],
            [
              'A demonstration of authentication with Submodels and OutMessage in Foldkit.',
            ],
          ),
          a(
            [
              Href(loginRouter()),
              Class(
                'inline-block px-8 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition',
              ),
            ],
            ['Sign In'],
          ),
        ],
      ),
      div(
        [Class('grid grid-cols-1 md:grid-cols-3 gap-8 mt-16')],
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

const featureCard = (title: string, description: string): Html =>
  div(
    [Class('bg-white rounded-lg shadow-md p-6')],
    [
      h2([Class('text-xl font-semibold text-gray-800 mb-3')], [title]),
      p([Class('text-gray-600')], [description]),
    ],
  )
