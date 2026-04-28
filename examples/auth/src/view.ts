import { Match as M } from 'effect'
import type { Document } from 'foldkit/html'

import { Class, div, keyed } from './html'
import { GotLoggedInMessage, GotLoggedOutMessage } from './message'
import { LoggedIn, LoggedOut, Model } from './model'

const title = (model: Model): string =>
  M.value(model.route).pipe(
    M.tag('Home', () => 'Auth'),
    M.orElse(({ _tag }) => `${_tag} — Auth`),
  )

export const view = (model: Model): Document => ({
  title: title(model),
  body: div(
    [Class('min-h-screen bg-gray-100')],
    [
      keyed('div')(
        model._tag,
        [],
        [
          M.value(model).pipe(
            M.tagsExhaustive({
              LoggedOut: loggedOutModel =>
                LoggedOut.view(loggedOutModel, message =>
                  GotLoggedOutMessage({ message }),
                ),
              LoggedIn: loggedInModel =>
                LoggedIn.view(loggedInModel, message =>
                  GotLoggedInMessage({ message }),
                ),
            }),
          ),
        ],
      ),
    ],
  ),
})
