import { Match as M } from 'effect'
import { Document, html } from 'foldkit/html'

const productsView = (model: Model): Html => {
  const h = html<Message>()

  return h.keyed('div')('Products', [], [productListView(model.products)])
}

const cartView = (model: Model): Html => {
  const h = html<Message>()

  return h.keyed('div')('Cart', [], [cartItemsView(model.cart)])
}

const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: `${model.route._tag} | Shop`,
    body: h.div(
      [],
      [
        h.header([], [navigationView(model.route)]),
        h.main(
          [],
          [
            M.value(model.route).pipe(
              M.tagsExhaustive({
                Products: () => productsView(model),
                Cart: () => cartView(model),
                Checkout: () => checkoutView(model),
                NotFound: ({ path }) => notFoundView(path),
              }),
            ),
          ],
        ),
      ],
    ),
  }
}
