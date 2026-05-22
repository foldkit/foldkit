import { Match as M } from 'effect'
import { type Document, html } from 'foldkit/html'

import { GotLoggedInMessage, GotLoggedOutMessage, Message } from './message'
import { LoggedIn, LoggedOut, Model } from './model'

const title = (model: Model): string =>
  M.value(model.route).pipe(
    M.tag('Home', () => 'Auth'),
    M.orElse(({ _tag }) => `${_tag} — Auth`),
  )

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: title(model),
    body: h.div(
      [h.Class('min-h-screen bg-gray-100')],
      [
        h.keyed('div')(
          model._tag,
          [],
          [
            M.value(model).pipe(
              M.tagsExhaustive({
                LoggedOut: loggedOutModel =>
                  h.submodel({
                    id: 'logged-out',
                    view: LoggedOut.view,
                    model: loggedOutModel,
                    toParentMessage: message =>
                      GotLoggedOutMessage({ message }),
                  }),
                LoggedIn: loggedInModel =>
                  h.submodel({
                    id: 'logged-in',
                    view: LoggedIn.view,
                    model: loggedInModel,
                    toParentMessage: message => GotLoggedInMessage({ message }),
                  }),
              }),
            ),
          ],
        ),
      ],
    ),
  }
}
