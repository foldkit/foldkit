import { Match as M } from 'effect'
import { Document, html } from 'foldkit/html'

const view = (model: Model): Document => {
  const h = html<Message>()

  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Products: () => productsView(model),
      Cart: () => cartView(model),
      Checkout: () => checkoutView(model),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  return {
    title: `${model.route._tag} — Shop`,
    body: h.div(
      [],
      [
        h.header([], [navigationView(model.route)]),
        h.main([], [h.keyed('div')(model.route._tag, [], [routeContent])]),
      ],
    ),
  }
}
