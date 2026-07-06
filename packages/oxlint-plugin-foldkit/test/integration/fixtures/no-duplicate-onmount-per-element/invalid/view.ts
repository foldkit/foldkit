import { html } from 'foldkit/html'

const h = html<Message>()

export const panel = h.div(
  [h.OnMount(AnchorPopover()), h.OnMount(SyncScroll())],
  [],
)
