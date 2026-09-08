import { Match, Option } from 'effect'
import { type Attribute, Html, inertHtml as ih } from 'foldkit/html'

import type { Alignment } from '@foldkit/markdown'
import type * as Markdown from '@foldkit/markdown'

import { CodeBlock } from '../component'
import {
  type RenderHeadingLink,
  diagram,
  headingWithContent,
  inlineCode,
  pageTitle,
} from '../prose'
import { parseHeadingId, stripHeadingIdMarker } from './slug'
import { type HeadingIds, headingId } from './tableOfContents'

// VIEWS

/** Everything a document needs to render its nodes with the site's styling. */
export type DocViewConfig = Readonly<{
  pageId: string
  idByHeading: HeadingIds
  renderCopyButton: CodeBlock.RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

const linkClassName = 'link-accent'

const blockquoteClassName =
  'border-l-4 border-gray-300 dark:border-gray-700 pl-4 italic text-gray-700 dark:text-gray-300 mb-5 [&>p:last-child]:mb-0'

const listClassName = 'mb-6 space-y-2 [&>li>p:last-child]:mb-0'

const diagramLanguage = 'diagram'

const tableWrapperClassName =
  'overflow-x-auto overscroll-x-none mb-6 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden'
const tableClassName = 'w-full min-w-[40rem]'
const tableHeadClassName =
  'bg-cream dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800'
const tableBodyClassName = 'bg-cream dark:bg-gray-900'
const tableRowClassName =
  'border-b border-gray-200 dark:border-gray-800 last:border-b-0'
const tableHeaderCellClassName =
  'px-4 py-3 text-left text-base font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-800 last:border-r-0'
const tableCellClassName =
  'px-4 py-3 text-base min-w-[12rem] text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-800 last:border-r-0'

const alignmentAttributes = (
  alignment: Alignment,
): ReadonlyArray<Attribute<never>> =>
  Match.value(alignment).pipe(
    Match.withReturnType<ReadonlyArray<Attribute<never>>>(),
    Match.when('None', () => []),
    Match.when('Left', () => [ih.Style({ 'text-align': 'left' })]),
    Match.when('Center', () => [ih.Style({ 'text-align': 'center' })]),
    Match.when('Right', () => [ih.Style({ 'text-align': 'right' })]),
    Match.exhaustive,
  )

const titleAttributes = (
  maybeTitle: Option.Option<string>,
): ReadonlyArray<Attribute<never>> =>
  Option.match(maybeTitle, {
    onNone: () => [],
    onSome: title => [ih.Title(title)],
  })

/**
 * The site's markdown node views. Every node not overridden here keeps the
 * package's unstyled semantic default. Headings resolve their id from the shared
 * map so anchors and the sidebar agree; code blocks and headings carry the copy
 * affordances and search attributes the hand-written prose helpers produce.
 */
export const docViews = (config: DocViewConfig): Partial<Markdown.Views> => {
  return {
    Paragraph: (_paragraph, content) =>
      ih.p([ih.Class('mb-5 leading-7')], content),

    Link: (link, content) =>
      ih.a(
        [
          ih.Href(link.url),
          ih.Class(linkClassName),
          ...titleAttributes(link.maybeTitle),
        ],
        content,
      ),

    InlineCode: ({ value }) => inlineCode(value),

    Heading: (heading, content) => {
      const { maybeId, text } = parseHeadingId(heading.content)
      const id = headingId(config.idByHeading, heading)
      const displayContent = Option.match(maybeId, {
        onNone: () => content,
        onSome: () => stripHeadingIdMarker(content),
      })

      return Match.value(heading.level).pipe(
        Match.withReturnType<Html>(),
        Match.when(1, () => pageTitle(config.pageId, text)),
        Match.when(2, () =>
          headingWithContent(
            'h2',
            id,
            text,
            displayContent,
            config.renderHeadingLink,
          ),
        ),
        Match.when(3, () =>
          headingWithContent(
            'h3',
            id,
            text,
            displayContent,
            config.renderHeadingLink,
          ),
        ),
        Match.when(4, () =>
          headingWithContent(
            'h4',
            id,
            text,
            displayContent,
            config.renderHeadingLink,
          ),
        ),
        Match.when(5, () =>
          headingWithContent(
            'h5',
            id,
            text,
            displayContent,
            config.renderHeadingLink,
          ),
        ),
        Match.when(6, () =>
          headingWithContent(
            'h6',
            id,
            text,
            displayContent,
            config.renderHeadingLink,
          ),
        ),
        Match.exhaustive,
      )
    },

    CodeBlock: ({ maybeLanguage, value }, occurrenceIndex) =>
      Option.contains(maybeLanguage, diagramLanguage)
        ? diagram(value)
        : CodeBlock.view(
            `${config.pageId}-code-${occurrenceIndex}`,
            value,
            'Copy code to clipboard',
            config.renderCopyButton,
            { className: 'mb-6', maybeLanguage },
          ),

    List: (list, items) => {
      if (list.isOrdered) {
        const start = Option.match(list.maybeStartNumber, {
          onNone: () => [],
          onSome: startNumber => [ih.Start(startNumber)],
        })
        return ih.ol(
          [ih.Class(`list-decimal ${listClassName}`), ...start],
          items,
        )
      } else {
        return ih.ul([ih.Class(`list-disc ${listClassName}`)], items)
      }
    },

    Blockquote: (_blockquote, blocks) =>
      ih.blockquote([ih.Class(blockquoteClassName)], blocks),

    ThematicBreak: () =>
      ih.hr([ih.Class('my-8 border-gray-200 dark:border-gray-800')]),

    Image: ({ url, alt, maybeTitle }) =>
      ih.img([
        ih.Src(url),
        ih.Alt(alt),
        ih.Class('max-w-full'),
        ...titleAttributes(maybeTitle),
      ]),

    Table: (_table, headerRow, bodyRows) =>
      ih.div(
        [ih.Class(tableWrapperClassName)],
        [
          ih.table(
            [ih.Class(tableClassName)],
            [
              ih.thead([ih.Class(tableHeadClassName)], [headerRow]),
              ih.tbody([ih.Class(tableBodyClassName)], bodyRows),
            ],
          ),
        ],
      ),

    TableRow: (_tableRow, cells) => ih.tr([ih.Class(tableRowClassName)], cells),

    TableCell: (_tableCell, content, alignment, isHeader) => {
      if (isHeader) {
        return ih.th(
          [
            ih.Class(tableHeaderCellClassName),
            ...alignmentAttributes(alignment),
          ],
          content,
        )
      } else {
        return ih.td(
          [ih.Class(tableCellClassName), ...alignmentAttributes(alignment)],
          content,
        )
      }
    },
  }
}
