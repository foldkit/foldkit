import type { Document, HtmlBuilder } from 'foldkit/html'

const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const routeContent = AppRoute.match(model.route, {
    Products: () => productsView(model, h),
    Cart: () => cartView(model, h),
    Checkout: () => checkoutView(model, h),
    NotFound: ({ path }) => notFoundView(path, h),
  })

  return {
    title: `${model.route._tag} | Shop`,
    body: h.div(
      [],
      [
        h.header([], [navigationView(model.route, h)]),
        h.main([], [routeContent]),
      ],
    ),
  }
}
