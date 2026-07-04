import { html } from 'foldkit/html'

const h = html<Message>()

// ❌ Bad
// A label with no For attribute is not associated with any control.
const badField = h.div(
  [],
  [h.label([], [text('Email')]), h.input([h.Id('email')])],
)

// ✅ Good
const goodField = h.div(
  [],
  [h.label([h.For('email')], [text('Email')]), h.input([h.Id('email')])],
)
