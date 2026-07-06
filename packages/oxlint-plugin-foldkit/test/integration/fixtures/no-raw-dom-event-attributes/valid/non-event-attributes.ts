import { html } from 'foldkit/html'

import type { Message } from './message'

const h = html<Message>()

// `online` and `onLine` are ordinary names, not DOM event handlers.
export const marker = h.div(
  [h.Attribute('online', 'true'), h.Prop({ key: 'onLine', value: true })],
  [],
)
