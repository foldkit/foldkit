import { clsx } from 'clsx'
import { Match as M } from 'effect'
import { Html } from 'foldkit/html'

import { Session } from '../../domain/session'
import { Class, Href, a, div, li, main, nav, ul } from '../../html'
import type { Message as ParentMessage } from '../../message'
import { notFoundView } from '../../notFoundView'
import { dashboardRouter, settingsRouter } from '../../route'
import { GotSettingsMessage, Message } from './message'
import { Model } from './model'
import * as Dashboard from './page/dashboard'
import * as Settings from './page/settings'

const navLinkClassName = (isActive: boolean) =>
  clsx('hover:bg-blue-600 font-medium px-3 py-1 rounded transition', {
    'bg-blue-700 bg-opacity-50': isActive,
  })

const navigationView = (session: Session, currentRouteTag: string): Html =>
  nav(
    [Class('bg-blue-500 text-white p-4')],
    [
      div(
        [Class('max-w-4xl mx-auto flex justify-between items-center')],
        [
          ul(
            [Class('flex gap-6 list-none')],
            [
              li(
                [],
                [
                  a(
                    [
                      Href(dashboardRouter()),
                      Class(navLinkClassName(currentRouteTag === 'Dashboard')),
                    ],
                    ['Dashboard'],
                  ),
                ],
              ),
              li(
                [],
                [
                  a(
                    [
                      Href(settingsRouter()),
                      Class(navLinkClassName(currentRouteTag === 'Settings')),
                    ],
                    ['Settings'],
                  ),
                ],
              ),
            ],
          ),
          div([Class('text-sm')], [`Signed in as ${session.email}`]),
        ],
      ),
    ],
  )

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [Class('min-h-screen')],
    [
      navigationView(model.session, model.route._tag),
      main(
        [Class('py-8')],
        [
          M.value(model.route).pipe(
            M.tagsExhaustive({
              Dashboard: () => Dashboard.view(model.session),
              Settings: () =>
                Settings.view(model.session, message =>
                  toMessage(GotSettingsMessage({ message })),
                ),
              NotFound: ({ path }) =>
                notFoundView(path, dashboardRouter(), 'Go to Dashboard'),
            }),
          ),
        ],
      ),
    ],
  )
