import { Match as M, Option } from 'effect'
import { type Attribute, Html, html } from 'foldkit/html'

import type { Alignment } from '@foldkit/markdown'
import type * as Markdown from '@foldkit/markdown'

import type { Message } from '../message'
import { headingWithContent, inlineCode, pageTitle } from '../prose'
import { type CopiedSnippets, codeBlock } from '../view/codeBlock'
import { inlineToText } from './slug'
import { type HeadingIds, headingId } from './tableOfContents'

// VIEWS

/** Everything a document needs to render its nodes with the site's styling. */
export type DocViewConfig = Readonly<{
  pageId: string
  idByHeading: HeadingIds
  copiedSnippets: CopiedSnippets
}>

const linkClassName =
  'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-normal'

const blockquoteClassName =
  'border-l-4 border-gray-300 dark:border-gray-700 pl-4 italic text-gray-700 dark:text-gray-300 mb-4 [&>p:last-child]:mb-0'

const listClassName = 'mb-8 space-y-2 [&>li>p:last-child]:mb-0'

const tableWrapperClassName = 'mb-8 overflow-x-auto'
const tableClassName = 'w-full text-sm'
const tableHeaderCellClassName =
  'py-2 pr-4 text-left font-medium text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700/50'
const tableCellClassName =
  'py-2.5 pr-4 align-top border-b border-gray-200 dark:border-gray-700/50'

const alignmentAttributes = (
  alignment: Alignment,
): ReadonlyArray<Attribute<Message>> => {
  const h = html<Message>()

  return M.value(alignment).pipe(
    M.withReturnType<ReadonlyArray<Attribute<Message>>>(),
    M.when('None', () => []),
    M.when('Left', () => [h.Style({ 'text-align': 'left' })]),
    M.when('Center', () => [h.Style({ 'text-align': 'center' })]),
    M.when('Right', () => [h.Style({ 'text-align': 'right' })]),
    M.exhaustive,
  )
}

const titleAttributes = (
  maybeTitle: Option.Option<string>,
): ReadonlyArray<Attribute<Message>> => {
  const h = html<Message>()

  return Option.match(maybeTitle, {
    onNone: () => [],
    onSome: title => [h.Title(title)],
  })
}

/**
 * The site's markdown node views. Every node not overridden here keeps the
 * package's unstyled semantic default. Headings resolve their id from the shared
 * map so anchors and the sidebar agree; code blocks and headings carry the copy
 * affordances and search attributes the hand-written prose helpers produce.
 */
export const docViews = (config: DocViewConfig): Partial<Markdown.Views> => {
  const h = html<Message>()

  return {
    Paragraph: (_paragraph, content) =>
      h.p([h.Class('mb-4 leading-relaxed')], content),

    Link: (link, content) =>
      h.a(
        [
          h.Href(link.url),
          h.Class(linkClassName),
          ...titleAttributes(link.maybeTitle),
        ],
        content,
      ),

    InlineCode: ({ value }) => inlineCode(value),

    Heading: (heading, content) => {
      const text = inlineToText(heading.content)
      const id = headingId(config.idByHeading, heading)

      return M.value(heading.level).pipe(
        M.withReturnType<Html>(),
        M.when(1, () => pageTitle(config.pageId, text)),
        M.when(2, () => headingWithContent('h2', id, text, content)),
        M.when(3, () => headingWithContent('h3', id, text, content)),
        M.when(4, () => headingWithContent('h4', id, text, content)),
        M.orElse(() => headingWithContent('h4', id, text, content)),
      )
    },

    CodeBlock: ({ maybeLanguage, value }) => {
      const language = Option.getOrElse(maybeLanguage, () => '')

      return codeBlock(
        value,
        'Copy code to clipboard',
        config.copiedSnippets,
        'mb-8',
        language,
      )
    },

    List: (list, items) => {
      if (list.isOrdered) {
        const start = Option.match(list.maybeStartNumber, {
          onNone: () => [],
          onSome: startNumber => [h.Start(startNumber)],
        })
        return h.ol([h.Class(`list-decimal ${listClassName}`), ...start], items)
      } else {
        return h.ul([h.Class(`list-disc ${listClassName}`)], items)
      }
    },

    Blockquote: (_blockquote, blocks) =>
      h.blockquote([h.Class(blockquoteClassName)], blocks),

    ThematicBreak: () =>
      h.hr([h.Class('my-8 border-gray-300 dark:border-gray-800')]),

    Image: ({ url, alt, maybeTitle }) =>
      h.img([
        h.Src(url),
        h.Alt(alt),
        h.Class('max-w-full'),
        ...titleAttributes(maybeTitle),
      ]),

    Table: (_table, headerRow, bodyRows) =>
      h.div(
        [h.Class(tableWrapperClassName)],
        [
          h.table(
            [h.Class(tableClassName)],
            [h.thead([], [headerRow]), h.tbody([], bodyRows)],
          ),
        ],
      ),

    TableRow: (_tableRow, cells) => h.tr([], cells),

    TableCell: (_tableCell, content, alignment, isHeader) => {
      if (isHeader) {
        return h.th(
          [
            h.Class(tableHeaderCellClassName),
            ...alignmentAttributes(alignment),
          ],
          content,
        )
      } else {
        return h.td(
          [h.Class(tableCellClassName), ...alignmentAttributes(alignment)],
          content,
        )
      }
    },
  }
}
