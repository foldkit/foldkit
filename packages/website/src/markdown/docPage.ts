import { HashSet } from 'effect'
import { Html, type HtmlBuilder } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

import { type TableOfContentsEntry } from '../main'
import { type Message } from '../message'
import { defaultRenderHeadingLink } from '../prose'
import { type CopiedSnippets, defaultRenderCopyButton } from '../view/codeBlock'
import { type DemoLabels, collectDemoLabels } from './demoLabel'
import { docIslands } from './islands'
import { type Slots } from './slots'
import { type HeadingIds, collectHeadings } from './tableOfContents'
import { docViews } from './views'

// DOC PAGE

const renderDocument = (
  document: Markdown.MarkdownDocument,
  pageId: string,
  idByHeading: HeadingIds,
  demoLabels: DemoLabels,
  slots: Slots<string>,
): Html =>
  Markdown.view(document, {
    views: docViews({
      pageId,
      idByHeading,
      renderCopyButton: slots.renderCopyButton,
      renderHeadingLink: slots.renderHeadingLink,
    }),
    islands: docIslands(slots, demoLabels),
  })

/**
 * A markdown-backed page that renders code snippets, so it takes copy state
 * alongside the root builder its copy affordances dispatch through.
 */
export type DocPage = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  view: (copiedSnippets: CopiedSnippets, h: HtmlBuilder<Message>) => Html
}>

/**
 * A markdown-backed page with no interactive content beyond the heading
 * copy-links, which still dispatch through the root builder.
 */
export type ProseDocPage = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  view: (h: HtmlBuilder<Message>) => Html
}>

/** A markdown-backed page whose markdown has slots the page itself fills. */
export type SlotDocPage<DemoName extends string> = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  view: (slots: Slots<DemoName>) => Html
}>

/**
 * Like {@link docPage}, for a page whose markdown carries interactive islands the
 * page has to fill in. Name the `::Demo` islands it embeds in the type argument:
 * `slotDocPage<'counter' | 'clock'>(raw, pageId)`. The page's dispatch site then
 * builds each one from Model state and passes them in by name, so the markdown
 * owns the prose and the app keeps owning the islands' Model. The slots also
 * carry the copy-button and heading-link renderers, built by whichever ancestor
 * holds the app's builder.
 */
export const slotDocPage = <DemoName extends string = never>(
  raw: unknown,
  pageId: string,
): SlotDocPage<DemoName> => {
  const document = Markdown.decodeDocument(raw)
  const { tableOfContents, idByHeading } = collectHeadings(document)
  const demoLabels = collectDemoLabels(document, idByHeading)

  return {
    tableOfContents,
    view: slots =>
      renderDocument(document, pageId, idByHeading, demoLabels, slots),
  }
}

/**
 * Turns a compiled `.md` module into a page's `{ view, tableOfContents }`
 * contract. The document is decoded and its headings numbered once, at module
 * load; `pageId` becomes the `h1` anchor and search section id, matching the
 * old `pageTitle` first argument. The view builds its copy-button and
 * heading-link renderers from the builder the dispatch site threads in, so it
 * demands the app's own builder.
 */
export const docPage = (raw: unknown, pageId: string): DocPage => {
  const { tableOfContents, view } = slotDocPage(raw, pageId)

  return {
    tableOfContents,
    view: (copiedSnippets, h) =>
      view({
        demos: {},
        renderCopyButton: defaultRenderCopyButton(copiedSnippets, h),
        renderHeadingLink: defaultRenderHeadingLink(h),
      }),
  }
}

/**
 * Like {@link docPage}, for pages that are pure prose. The view takes only the
 * builder, so a dispatch site calls `view(h)` with no copy state to thread.
 */
export const proseDocPage = (raw: unknown, pageId: string): ProseDocPage => {
  const { tableOfContents, view } = docPage(raw, pageId)

  return {
    tableOfContents,
    view: h => view(HashSet.empty(), h),
  }
}
