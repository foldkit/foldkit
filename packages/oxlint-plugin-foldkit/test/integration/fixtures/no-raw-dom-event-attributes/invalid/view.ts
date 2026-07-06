import { html } from 'foldkit/html'

import type { Message } from './message'

const h = html<Message>()

export const reloadButton = h.button(
  [h.Attribute('onclick', 'location.reload()')],
  ['Reload'],
)
