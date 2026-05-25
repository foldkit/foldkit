import { Match as M } from 'effect'
import { Submodel } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { notFoundView } from '../../notFoundView'
import { homeRouter } from '../../route'
import { GotLoginMessage, Message } from './message'
import { Model } from './model'
import * as Home from './page/home'
import * as Login from './page/login'

export const view = Submodel.defineView<Model, Message>((model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('py-8')],
    [
      h.keyed('div')(
        model.route._tag,
        [],
        [
          M.value(model.route).pipe(
            M.tagsExhaustive({
              Home: () => Home.view(),
              Login: () =>
                h.submodel({
                  slotId: 'login',
                  model: model.loginModel,
                  view: Login.view,
                  toParentMessage: message => GotLoginMessage({ message }),
                }),
              NotFound: ({ path }) =>
                notFoundView(path, homeRouter(), 'Go Home'),
            }),
          ),
        ],
      ),
    ],
  )
})
