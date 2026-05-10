import { html } from 'foldkit/html'

const h = html<Message>()

const cartView = (model: Model): Html =>
  h.div(
    [],
    [
      h.keyed('div')('summary', [], [summaryView(model)]),
      ...(model.hasDiscount
        ? [h.keyed('div')('discount', [], [discountView(model)])]
        : []),
      h.keyed('div')('checkout', [], [checkoutView(model)]),
    ],
  )
