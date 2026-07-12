import { Match as M } from 'effect'
import { html } from 'foldkit/html'

const productsView = (model: Model): Html => {
  const h = html<Message>()

  return h.keyed('div')('Products', [], [productListView(model.products)])
}

const cartView = (model: Model): Html => {
  const h = html<Message>()

  return h.keyed('div')('Cart', [], [cartItemsView(model.cart)])
}

const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
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
  )
}
