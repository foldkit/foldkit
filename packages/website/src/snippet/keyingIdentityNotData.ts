import type { Html, HtmlBuilder } from 'foldkit/html'

// ❌ Displayed data is not identity
const reviewPanelKeyedByData = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.keyed('div')(
    `${model.isCardSelected}:${model.isTermsAccepted}`,
    [],
    [reviewContentView(model, h)],
  )

// ✅ The same panel remains the same entity
const reviewPanel = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div([], [reviewContentView(model, h)])
