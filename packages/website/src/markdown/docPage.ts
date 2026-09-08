import { Html, inertHtml as ih } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

import { type CodeBlock } from '../component'
import { type RenderHeadingLink } from '../prose'
import { type TableOfContentsEntry } from '../tableOfContentsEntry'
import { type DemoLabels, collectDemoLabels } from './demoLabel'
import { docIslands } from './islands'
import { type Slots } from './slots'
import { type HeadingIds, collectHeadings } from './tableOfContents'
import { docViews } from './views'

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
    islands: docIslands(slots, demoLabels, pageId),
  })

/**
 * A markdown-backed page that receives the interactive renderers its content
 * uses without depending on the application boundary that owns them.
 */
export type DocPage = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  view: (
    renderCopyButton: CodeBlock.RenderCopyButton,
    renderHeadingLink: RenderHeadingLink,
  ) => Html
}>

/**
 * A markdown-backed page with no interactive content beyond heading
 * copy-links.
 */
export type ProseDocPage = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  view: (renderHeadingLink: RenderHeadingLink) => Html
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
 * old `pageTitle` first argument. The view receives interactive renderers from
 * the dispatch site without importing its Model or Message.
 */
export const docPage = (raw: unknown, pageId: string): DocPage => {
  const { tableOfContents, view } = slotDocPage(raw, pageId)

  return {
    tableOfContents,
    view: (renderCopyButton, renderHeadingLink) =>
      view({
        demos: {},
        renderCopyButton,
        renderHeadingLink,
      }),
  }
}

/**
 * Like {@link docPage}, for pages that are pure prose. The view takes only the
 * heading-link renderer and has no copy-button dependency.
 */
export const proseDocPage = (raw: unknown, pageId: string): ProseDocPage => {
  const { tableOfContents, view } = docPage(raw, pageId)

  return {
    tableOfContents,
    view: renderHeadingLink => view(() => ih.empty, renderHeadingLink),
  }
}
