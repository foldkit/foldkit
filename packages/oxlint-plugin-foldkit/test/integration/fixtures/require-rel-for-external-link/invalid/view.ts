import { inertHtml as ih } from 'foldkit/html'

export const docsLink = ih.a(
  [ih.Href('https://example.com'), ih.Target('_blank')],
  ['Docs'],
)
