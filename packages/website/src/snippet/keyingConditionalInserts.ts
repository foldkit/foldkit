import { html } from 'foldkit/html'

const cartView = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.keyed('div')('summary', [], [summaryView(model)]),
      ...(model.hasDiscount
        ? [h.keyed('div')('discount', [], [discountView(model)])]
        : []),
      h.keyed('div')('checkout', [], [checkoutView(model)]),
    ],
  )
}
