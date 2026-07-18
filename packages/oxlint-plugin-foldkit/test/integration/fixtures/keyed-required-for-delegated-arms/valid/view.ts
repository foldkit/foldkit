import { Match as M } from 'effect'
import { html } from 'foldkit/html'

import { aboutView } from './about'
import { homeView } from './home'
import type { Message } from './message'
import type { Model } from './model'
import { discountedBannerClass, fullPriceBannerClass } from './pricing'
import { summaryView } from './summary'

const h = html<Message>()

export const view = (model: Model) => {
  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => homeView(model),
      About: () => aboutView(model),
    }),
  )

  const bannerClass = model.isDiscounted
    ? discountedBannerClass(model.cart)
    : fullPriceBannerClass(model.cart)

  return h.div(
    [h.Class('app')],
    [
      h.keyed('div')(model.route._tag, [], [routeContent]),
      model.isDetail ? h.p([], ['Full detail below.']) : summaryView(model),
      h.aside([h.Class(bannerClass)], ['Prices update daily.']),
    ],
  )
}
