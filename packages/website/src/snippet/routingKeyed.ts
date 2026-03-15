import { html } from 'foldkit/html'
import * as M from 'foldkit/match'

const { div, header, main, keyed } = html<Message>()

const view = (model: Model): Html => {
  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Products: () => productsView(model),
      Cart: () => cartView(model),
      Checkout: () => checkoutView(model),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  return div(
    [],
    [
      header([], [navigationView(model.route)]),
      main([], [keyed('div')(model.route._tag, [], [routeContent])]),
    ],
  )
}
