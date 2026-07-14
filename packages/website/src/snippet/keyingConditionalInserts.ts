import { html } from 'foldkit/html'

const cartView = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      summaryView(model),
      ...(model.hasDiscount
        ? [h.keyed('div')('discount', [], [discountView(model)])]
        : []),
      checkoutView(model),
    ],
  )
}
