import { Match } from 'effect'

import { notFoundView } from '../../notFoundView'
import { homeRouter } from '../../route'
import { LoggedOutComposition, LoginBinding } from './composition'
import * as Home from './page/home'

export const view = LoggedOutComposition.makeView((model, h) =>
  h.div(
    [h.Class('py-8')],
    [
      Match.value(model.route).pipe(
        Match.tagsExhaustive({
          Home: () => Home.view(h),
          Login: () =>
            h.block(
              LoginBinding.embedView({
                slotId: 'login',
                model: model.loginModel,
              }),
            ),
          NotFound: ({ path }) =>
            notFoundView(path, homeRouter(), 'Go Home', h),
        }),
      ),
    ],
  ),
)
