import { html } from 'foldkit/html'

import type { Message } from './message'

const h = html<Message>()

export const docsLink = h.a(
  [h.Href('https://example.com'), h.Target('_blank')],
  ['Docs'],
)
