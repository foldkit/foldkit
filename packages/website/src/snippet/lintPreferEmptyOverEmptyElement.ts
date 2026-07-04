import { html } from 'foldkit/html'

const h = html<Message>()

// ❌ Bad
// An empty element is a placeholder for nothing.
const badPlaceholder = (isVisible: boolean) =>
  isVisible ? h.div([], [text('Ready')]) : h.div([], [])

// ✅ Good
// Render the empty node instead.
const goodPlaceholder = (isVisible: boolean) =>
  isVisible ? h.div([], [text('Ready')]) : h.empty
