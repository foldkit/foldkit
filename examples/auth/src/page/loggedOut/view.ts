import { Match as M } from 'effect'
import { Html, html } from 'foldkit/html'

import { notFoundView } from '../../notFoundView'
import { homeRouter } from '../../route'
import { GotLoginMessage, Message } from './message'
import { Model } from './model'
import * as Home from './page/home'
import * as Login from './page/login'

export const view = <ParentMessage>(
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [h.Class('py-8')],
    [
      M.value(model.route).pipe(
        M.tagsExhaustive({
          Home: () => Home.view<ParentMessage>(),
          Login: () =>
            Login.view<ParentMessage>(model.loginModel, message =>
              toParentMessage(GotLoginMessage({ message })),
            ),
          NotFound: ({ path }) =>
            notFoundView<ParentMessage>(path, homeRouter(), 'Go Home'),
        }),
      ),
    ],
  )
}
