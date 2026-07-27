import { html } from 'foldkit/html'

const h = html<Message>()

// ❌ Bad
// target="_blank" without rel leaves the new tab able to reach window.opener.
const badLink = h.a(
  [h.Href('https://example.com'), h.Target('_blank')],
  ['Docs'],
)

// ✅ Good
const goodLink = h.a(
  [
    h.Href('https://example.com'),
    h.Target('_blank'),
    h.Rel('noopener noreferrer'),
  ],
  ['Docs'],
)
