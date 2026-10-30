import { clsx } from 'clsx'
import { Effect, Match } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'

import { notFoundView } from '../../domain/notFoundView'
import type { Session } from '../../domain/session'
import {
  type LoggedInRoute,
  dashboardRouter,
  settingsRouter,
} from '../../route'

const Message = defineMessageUnion({
  ClickedLogout: {},
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  RequestedLogout: {},
})

type ViewInput = Readonly<{ route: LoggedInRoute; session: Session }>

export class LoggedIn extends Block<LoggedIn, void, ViewInput>()('LoggedIn', {
  Message,
  OutMessage,
}) {}

export const LoggedInLive = LoggedIn.make(
  Effect.fn(function* () {
    return {
      update: {
        ClickedLogout: model => ({
          model,
          outMessage: OutMessage.RequestedLogout(),
        }),
      },

      view: (_model, h, { route, session }) =>
        h.div(
          [h.Class('min-h-screen')],
          [
            navigationView(session, route._tag, h),
            h.main(
              [h.Class('py-8')],
              [
                Match.value(route).pipe(
                  Match.tagsExhaustive({
                    Dashboard: () => dashboardView(session, h),
                    Settings: () => settingsView(session, h),
                    NotFound: ({ path }) =>
                      notFoundView(
                        path,
                        dashboardRouter(),
                        'Go to Dashboard',
                        h,
                      ),
                  }),
                ),
              ],
            ),
          ],
        ),
    }
  }),
)

type LoggedInViewBuilder = HtmlBuilder<Message>

const navLinkClassName = (isActive: boolean) =>
  clsx('hover:bg-blue-600 font-medium px-3 py-1 rounded transition', {
    'bg-blue-700 bg-opacity-50': isActive,
  })

const navigationView = (
  session: Session,
  currentRouteTag: string,
  h: LoggedInViewBuilder,
): Html =>
  h.nav(
    [h.Class('bg-blue-500 text-white p-4')],
    [
      h.div(
        [h.Class('max-w-4xl mx-auto flex justify-between items-center')],
        [
          h.ul(
            [h.Class('flex gap-6 list-none')],
            [
              h.li(
                [],
                [
                  h.a(
                    [
                      h.Href(dashboardRouter()),
                      h.Class(
                        navLinkClassName(currentRouteTag === 'Dashboard'),
                      ),
                    ],
                    ['Dashboard'],
                  ),
                ],
              ),
              h.li(
                [],
                [
                  h.a(
                    [
                      h.Href(settingsRouter()),
                      h.Class(navLinkClassName(currentRouteTag === 'Settings')),
                    ],
                    ['Settings'],
                  ),
                ],
              ),
            ],
          ),
          h.div([h.Class('text-sm')], [`Signed in as ${session.email}`]),
        ],
      ),
    ],
  )

const statCard = (title: string, value: string, h: LoggedInViewBuilder): Html =>
  h.div(
    [h.Class('bg-white rounded-lg shadow-md p-6')],
    [
      h.h2(
        [h.Class('text-sm font-medium text-gray-500 uppercase mb-1')],
        [title],
      ),
      h.p([h.Class('text-3xl font-bold text-gray-800')], [value]),
    ],
  )

const dashboardView = (session: Session, h: LoggedInViewBuilder): Html =>
  h.div(
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
          statCard('Total Sessions', '42', h),
          statCard('Active Projects', '7', h),
          statCard('Tasks Completed', '128', h),
        ],
      ),
    ],
  )

const infoRow = (label: string, value: string, h: LoggedInViewBuilder): Html =>
  h.div(
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

const settingsView = (session: Session, h: LoggedInViewBuilder): Html =>
  h.div(
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
              infoRow('User ID', session.userId, h),
              infoRow('Email', session.email, h),
              infoRow('Name', session.name, h),
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
          Button.view(
            {
              onClick: Message.ClickedLogout(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'px-6 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition cursor-pointer',
                    ),
                  ],
                  ['Sign Out'],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
