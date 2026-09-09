import type { HtmlBuilder } from 'foldkit/html'

// ❌ Bad
// The trailing [] is what the builder already defaults to, so it carries nothing.
const badDivider = (h: HtmlBuilder<Message>) =>
  h.div([h.Class('h-px bg-gray-200')], [])
const badRows = (tags: ReadonlyArray<Tag>, h: HtmlBuilder<Message>) =>
  h.ul(
    [],
    tags.map(tag => h.keyed('li')(tag.id, [h.Class(tag.className)], [])),
  )

// ✅ Good
// Omit the argument. Attributes stay required, so h.div([]) is an element with neither.
const goodDivider = (h: HtmlBuilder<Message>) =>
  h.div([h.Class('h-px bg-gray-200')])
const goodRows = (tags: ReadonlyArray<Tag>, h: HtmlBuilder<Message>) =>
  h.ul(
    [],
    tags.map(tag => h.keyed('li')(tag.id, [h.Class(tag.className)])),
  )
