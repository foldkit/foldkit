import { clsx } from 'clsx'
import { Match as M } from 'effect'
import { Html, html } from 'foldkit/html'

import { Session } from '../../domain/session'
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

const navigationView = <ParentMessage>(
  session: Session,
  currentRouteTag: string,
): Html => {
  const h = html<ParentMessage>()

  return h.nav(
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
}

export const view = <ParentMessage>(
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [h.Class('min-h-screen')],
    [
      navigationView<ParentMessage>(model.session, model.route._tag),
      h.main(
        [h.Class('py-8')],
        [
          M.value(model.route).pipe(
            M.tagsExhaustive({
              Dashboard: () => Dashboard.view<ParentMessage>(model.session),
              Settings: () =>
                Settings.view<ParentMessage>(model.session, message =>
                  toParentMessage(GotSettingsMessage({ message })),
                ),
              NotFound: ({ path }) =>
                notFoundView<ParentMessage>(
                  path,
                  dashboardRouter(),
                  'Go to Dashboard',
                ),
            }),
          ),
        ],
      ),
    ],
  )
}
