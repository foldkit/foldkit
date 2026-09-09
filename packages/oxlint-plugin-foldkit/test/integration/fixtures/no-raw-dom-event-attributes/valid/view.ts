import type { Html, HtmlBuilder } from 'foldkit/html'

import { ClickedReload } from './message'
import type { Message } from './message'

export const reloadButton = (h: HtmlBuilder<Message>): Html =>
  h.button([h.OnClick(ClickedReload())], ['Reload'])
