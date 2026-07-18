import { Match as M, Option } from 'effect'
import { html } from 'foldkit/html'

import { aboutView } from './about'
import { homeView } from './home'
import type { Message } from './message'
import type { Model } from './model'
import { toastView } from './toast'

const h = html<Message>()

export const view = (model: Model) => {
  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => homeView(model),
      About: () => aboutView(model),
    }),
  )

  return h.div(
    [h.Class('app')],
    [
      routeContent,
      Option.match(model.maybeToast, {
        onNone: () => h.empty,
        onSome: toast => toastView(toast),
      }),
    ],
  )
}
