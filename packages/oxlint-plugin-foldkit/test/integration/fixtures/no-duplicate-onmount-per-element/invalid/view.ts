import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from './message'

export const panel = (h: HtmlBuilder<Message>): Html =>
  h.div([h.OnMount(AnchorPopover()), h.OnMount(SyncScroll())])
