import { html } from 'foldkit/html'

import type { Message } from './message'

const h = html<Message>()

const externalLinkAttributes = [h.Rel('noopener noreferrer')]

// The protective Rel arrives through a spread, so it cannot be proven absent.
export const docsLink = h.a(
  [
    h.Href('https://example.com'),
    h.Target('_blank'),
    ...externalLinkAttributes,
  ],
  ['Docs'],
)
