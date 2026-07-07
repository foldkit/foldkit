import { html } from 'foldkit/html'

const h = html<Message>()

// ❌ Bad
// A raw DOM event attribute escapes the typed handlers and the Message flow.
const badButton = h.button(
  [h.Attribute('onclick', 'location.reload()')],
  [text('Reload')],
)

// ✅ Good
// Dispatch a Message through the typed event helper.
const goodButton = h.button([h.OnClick(ClickedReload())], [text('Reload')])
