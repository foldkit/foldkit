import { Match } from 'effect'
import { type Document, HtmlBuilder } from 'foldkit/html'

import { Message } from './message'
import { LoggedIn, LoggedOut, Model } from './model'

const title = (model: Model): string =>
  Match.value(model.route).pipe(
    Match.tag('Home', () => 'Auth'),
    Match.orElse(({ _tag }) => `${_tag} | Auth`),
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: title(model),
  body: h.div(
    [h.Class('min-h-screen bg-gray-100')],
    [
      Match.value(model).pipe(
        Match.tagsExhaustive({
          LoggedOut: loggedOutModel =>
            h.submodel({
              slotId: 'logged-out',
              model: loggedOutModel,
              view: LoggedOut.view,
              toParentMessage: message =>
                Message.GotLoggedOutMessage({ message }),
            }),
          LoggedIn: loggedInModel =>
            h.submodel({
              slotId: 'logged-in',
              model: loggedInModel,
              view: LoggedIn.view,
              toParentMessage: message =>
                Message.GotLoggedInMessage({ message }),
            }),
        }),
      ),
    ],
  ),
})
