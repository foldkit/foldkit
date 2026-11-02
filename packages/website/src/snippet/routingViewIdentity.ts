import { Schema } from 'effect'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineRouteUnion } from 'foldkit/route'

const ApplicationRoute = defineRouteUnion({
  Products: {},
  Cart: {},
  Checkout: {},
  NotFound: { path: Schema.String },
})
type ApplicationRoute = typeof ApplicationRoute.Type

const Model = Schema.Struct({
  route: ApplicationRoute,
  cartItemNames: Schema.Array(Schema.String),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedCheckout: {} })
type Message = typeof Message.Type

type ApplicationViewBuilder = HtmlBuilder<Message>

const productsView = (h: ApplicationViewBuilder): Html =>
  h.section([], [h.h1([], ['Products'])])

const cartView = (model: Model, h: ApplicationViewBuilder): Html =>
  h.section(
    [],
    [
      h.ul(
        [],
        model.cartItemNames.map(name => h.keyed('li')(name, [], [name])),
      ),
      h.button([h.OnClick(Message.ClickedCheckout())], ['Checkout']),
    ],
  )

const checkoutView = (h: ApplicationViewBuilder): Html =>
  h.form([], [h.h1([], ['Checkout'])])

const notFoundView = (path: string, h: ApplicationViewBuilder): Html =>
  h.p([], [`No page at ${path}`])

// Each route arm calls its own view function, so changing routes
// replaces the page instead of patching it
export const view = (model: Model, h: ApplicationViewBuilder): Document => {
  const routeContent = ApplicationRoute.match(model.route, {
    Products: () => productsView(h),
    Cart: () => cartView(model, h),
    Checkout: () => checkoutView(h),
    NotFound: ({ path }) => notFoundView(path, h),
  })

  return {
    title: `${model.route._tag} | Shop`,
    body: h.div([], [h.main([], [routeContent])]),
  }
}
