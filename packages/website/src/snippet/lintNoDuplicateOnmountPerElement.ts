import { html } from 'foldkit/html'

const h = html<Message>()

// ❌ Bad
// Two OnMount handlers on one element: the second overwrites the first.
const badPanel = h.div(
  [h.OnMount(AnchorPopover()), h.OnMount(SyncScroll())],
  [],
)

// ✅ Good
// One OnMount per element; combine the work into a single Mount if needed.
const goodPanel = h.div([h.OnMount(AnchorPopover())], [])
