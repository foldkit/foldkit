import { html } from 'foldkit/html'

import { ClickedReload } from './message'
import type { Message } from './message'

const h = html<Message>()

export const reloadButton = h.button([h.OnClick(ClickedReload())], ['Reload'])
