import { Match as M } from 'effect'
import { type Document, HtmlBuilder } from 'foldkit/html'

import { GotLoggedInMessage, GotLoggedOutMessage, Message } from './message'
import { LoggedIn, LoggedOut, Model } from './model'

const title = (model: Model): string =>
  M.value(model.route).pipe(
    M.tag('Home', () => 'Auth'),
    M.orElse(({ _tag }) => `${_tag} | Auth`),
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: title(model),
  body: h.div(
    [h.Class('min-h-screen bg-gray-50')],
    [
      M.value(model).pipe(
        M.tagsExhaustive({
          LoggedOut: loggedOutModel =>
            h.submodel({
              slotId: 'logged-out',
              model: loggedOutModel,
              view: LoggedOut.view,
              toParentMessage: message => GotLoggedOutMessage({ message }),
            }),
          LoggedIn: loggedInModel =>
            h.submodel({
              slotId: 'logged-in',
              model: loggedInModel,
              view: LoggedIn.view,
              toParentMessage: message => GotLoggedInMessage({ message }),
            }),
        }),
      ),
    ],
  ),
})
