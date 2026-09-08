import { Match } from 'effect'
import { Submodel } from 'foldkit'

import { notFoundView } from '../../notFoundView'
import { homeRouter } from '../../route'
import { Message } from './message'
import { Model } from './model'
import * as Home from './page/home'
import * as Login from './page/login'

export const view = Submodel.defineView<Model, Message>((model, h) =>
  h.div(
    [h.Class('py-8')],
    [
      Match.value(model.route).pipe(
        Match.tagsExhaustive({
          Home: () => Home.view(h),
          Login: () =>
            h.submodel({
              slotId: 'login',
              model: model.loginModel,
              view: Login.view,
              toParentMessage: message => Message.GotLoginMessage({ message }),
            }),
          NotFound: ({ path }) =>
            notFoundView(path, homeRouter(), 'Go Home', h),
        }),
      ),
    ],
  ),
)
