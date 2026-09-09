import type { HtmlBuilder } from 'foldkit/html'

// ❌ Bad
// A raw DOM event attribute escapes the typed handlers and the Message flow.
const badButton = (h: HtmlBuilder<Message>) =>
  h.button([h.Attribute('onclick', 'location.reload()')], ['Reload'])

// ✅ Good
// Dispatch a Message through the typed event helper.
const goodButton = (h: HtmlBuilder<Message>) =>
  h.button([h.OnClick(ClickedReload())], ['Reload'])
