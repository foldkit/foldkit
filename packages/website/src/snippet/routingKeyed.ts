import { Match as M } from 'effect'
import { Document, html } from 'foldkit/html'

const { div, header, main, keyed } = html<Message>()

const view = (model: Model): Document => {
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
    body: div(
      [],
      [
        header([], [navigationView(model.route)]),
        main([], [keyed('div')(model.route._tag, [], [routeContent])]),
      ],
    ),
  }
}
