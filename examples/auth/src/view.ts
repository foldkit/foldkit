import { Match } from 'effect'

import {
  ApplicationComposition,
  LoggedInBinding,
  LoggedOutBinding,
} from './composition'
import { Model } from './model'

const title = (model: Model): string =>
  Match.value(model.route).pipe(
    Match.tag('Home', () => 'Auth'),
    Match.orElse(({ _tag }) => `${_tag} | Auth`),
  )

export const view = ApplicationComposition.makeView((model, h) => ({
  title: title(model),
  body: h.div(
    [h.Class('min-h-screen bg-gray-100')],
    [
      Match.value(model).pipe(
        Match.tagsExhaustive({
          LoggedOut: loggedOutModel =>
            h.block(
              LoggedOutBinding.embedView({
                slotId: 'logged-out',
                model: loggedOutModel,
              }),
            ),
          LoggedIn: loggedInModel =>
            h.block(
              LoggedInBinding.embedView({
                slotId: 'logged-in',
                model: loggedInModel,
              }),
            ),
        }),
      ),
    ],
  ),
}))
