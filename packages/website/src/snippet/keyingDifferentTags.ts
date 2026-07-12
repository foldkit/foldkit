import { html } from 'foldkit/html'

// A span and an a can never patch into each other, so no keys are needed
const accountLink = (model: Model): Html => {
  const h = html<Message>()

  if (model.isAccountEnabled) {
    return h.a([h.Href('/account')], ['Account'])
  } else {
    return h.span([h.Class('text-gray-400')], ['Account'])
  }
}
