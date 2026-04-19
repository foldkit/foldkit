import { Match as M } from 'effect'
import { Html } from 'foldkit/html'

import { Class, div, keyed } from './html'
import { GotLoggedInMessage, GotLoggedOutMessage } from './message'
import { LoggedIn, LoggedOut, Model } from './model'

export const view = (model: Model): Html =>
  div(
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
  )
