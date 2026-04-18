import { html } from 'foldkit/html'

const { div, keyed } = html<Message>()

const cartView = (model: Model): Html =>
  div(
    [],
    [
      keyed('div')('summary', [], [summaryView(model)]),
      ...(model.hasDiscount
        ? [keyed('div')('discount', [], [discountView(model)])]
        : []),
      keyed('div')('checkout', [], [checkoutView(model)]),
    ],
  )
