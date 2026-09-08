import type { HtmlBuilder } from 'foldkit/html'

// ❌ Bad
// Two OnMount handlers on one element: the second overwrites the first.
const badPanel = (h: HtmlBuilder<Message>) =>
  h.div([h.OnMount(AnchorPopover()), h.OnMount(SyncScroll())])

// ✅ Good
// One OnMount per element; combine the work into a single Mount if needed.
const goodPanel = (h: HtmlBuilder<Message>) =>
  h.div([h.OnMount(AnchorPopover())])
