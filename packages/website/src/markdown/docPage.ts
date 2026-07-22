import { HashSet } from 'effect'
import { Html } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

import { type TableOfContentsEntry } from '../main'
import { type CopiedSnippets } from '../view/codeBlock'
import { docIslands } from './islands'
import { type HeadingIds, collectHeadings } from './tableOfContents'
import { docViews } from './views'

// PAGE

const renderDocument = (
  document: Markdown.MarkdownDocument,
  pageId: string,
  idByHeading: HeadingIds,
  copiedSnippets: CopiedSnippets,
): Html =>
  Markdown.view(document, {
    views: docViews({ pageId, idByHeading, copiedSnippets }),
    islands: docIslands(copiedSnippets),
  })

/** A markdown-backed page that renders code snippets, so it takes copy state. */
export type DocPage = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  view: (copiedSnippets: CopiedSnippets) => Html
}>

/** A markdown-backed page with no interactive content. */
export type ProseDocPage = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  view: () => Html
}>

/**
 * Turns a compiled `.md` module into a page's `{ view, tableOfContents }`
 * contract. The document is decoded and its headings numbered once, at module
 * load; `pageId` becomes the `h1` anchor and search section id, matching the
 * old `pageTitle` first argument.
 */
export const docPage = (raw: unknown, pageId: string): DocPage => {
  const document = Markdown.decodeDocument(raw)
  const { tableOfContents, idByHeading } = collectHeadings(document)

  return {
    tableOfContents,
    view: copiedSnippets =>
      renderDocument(document, pageId, idByHeading, copiedSnippets),
  }
}

/**
 * Like {@link docPage}, for pages that are pure prose. The view takes no
 * arguments, so the existing dispatch site that calls `view()` is unchanged.
 */
export const proseDocPage = (raw: unknown, pageId: string): ProseDocPage => {
  const { tableOfContents, view } = docPage(raw, pageId)

  return {
    tableOfContents,
    view: () => view(HashSet.empty()),
  }
}
