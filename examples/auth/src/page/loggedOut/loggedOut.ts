import { Effect, Match, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { notFoundView } from '../../domain/notFoundView'
import { Session } from '../../domain/session'
import { type LoggedOutRoute, homeRouter, loginRouter } from '../../route'
import { Login } from './login'

const Model = Schema.Struct({
  login: Login,
})

const OutMessage = defineMessageUnion({
  SucceededLogin: { session: Session },
})

type ViewInput = Readonly<{ route: LoggedOutRoute }>

export class LoggedOut extends Block<LoggedOut, void, ViewInput>()(
  'LoggedOut',
  {
    Model,
    OutMessage,
  },
) {}

export const LoggedOutLive = LoggedOut.make(
  Effect.fn(function* () {
    const login = yield* new Login('login')

    return {
      model: { login },

      update: {
        ...login.on({
          SucceededLogin: (model, { session }) => ({
            model,
            outMessage: OutMessage.SucceededLogin({ session }),
          }),
        }),
      },

      view: (model, h, { route }) =>
        h.div(
          [h.Class('py-8')],
          [
            Match.value(route).pipe(
              Match.tagsExhaustive({
                Home: () => homeView(h),
                Login: () => model.login.view(),
                NotFound: ({ path }) =>
                  notFoundView(path, homeRouter(), 'Go Home', h),
              }),
            ),
          ],
        ),
    }
  }),
)

type LoggedOutViewBuilder = HtmlBuilder<never>

const featureCard = (
  title: string,
  description: string,
  h: LoggedOutViewBuilder,
): Html =>
  h.div(
    [h.Class('bg-white rounded-lg shadow-md p-6')],
    [
      h.h2([h.Class('text-xl font-semibold text-gray-800 mb-3')], [title]),
      h.p([h.Class('text-gray-600')], [description]),
    ],
  )

const homeView = (h: LoggedOutViewBuilder): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.div(
        [h.Class('text-center py-16')],
        [
          h.h1(
            [h.Class('text-5xl font-bold text-gray-800 mb-6')],
            ['Welcome to Auth Example'],
          ),
          h.p(
            [h.Class('text-xl text-gray-600 mb-8')],
            [
              'A demonstration of authentication with Blocks and OutMessage in Foldkit.',
            ],
          ),
          h.a(
            [
              h.Href(loginRouter()),
              h.Class(
                'inline-block px-8 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition',
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
            h,
          ),
          featureCard(
            'Route Guards',
            'Protected routes redirect to login. Auth routes redirect to dashboard when logged in.',
            h,
          ),
          featureCard(
            'Session Persistence',
            'Session survives page refresh via localStorage and the Flags pattern.',
            h,
          ),
        ],
      ),
    ],
  )
