import { inertHtml as ih } from 'foldkit/html'

const externalLinkAttributes = [ih.Rel('noopener noreferrer')]

// The protective Rel arrives through a spread, so it cannot be proven absent.
export const docsLink = ih.a(
  [
    ih.Href('https://example.com'),
    ih.Target('_blank'),
    ...externalLinkAttributes,
  ],
  ['Docs'],
)
