import { Match, Option } from 'effect'
import { Html, inertHtml as ih } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

const headingView = (
  heading: Markdown.Heading,
  content: Markdown.InlineContent,
): Html =>
  Match.value(heading.level).pipe(
    Match.when(1, () =>
      ih.h1([ih.Class('text-3xl font-bold text-stone-900')], content),
    ),
    Match.when(2, () =>
      ih.h2([ih.Class('mt-10 text-2xl font-semibold text-stone-900')], content),
    ),
    Match.when(3, () =>
      ih.h3([ih.Class('mt-8 text-xl font-semibold text-stone-900')], content),
    ),
    Match.when(4, () =>
      ih.h4([ih.Class('mt-6 text-lg font-semibold text-stone-900')], content),
    ),
    Match.when(5, () =>
      ih.h5([ih.Class('mt-6 font-semibold text-stone-900')], content),
    ),
    Match.when(6, () =>
      ih.h6([ih.Class('mt-6 text-sm font-semibold text-stone-900')], content),
    ),
    Match.exhaustive,
  )

const codeBlockView = (codeBlock: Markdown.CodeBlock): Html =>
  ih.div(
    [ih.Class('overflow-hidden rounded-lg bg-stone-900')],
    [
      ...Option.match(codeBlock.maybeLanguage, {
        onNone: () => [],
        onSome: language => [
          ih.keyed('div')(
            'Language',
            [
              ih.Class(
                'border-b border-stone-700 px-4 py-1.5 font-mono text-xs text-stone-400',
              ),
            ],
            [language],
          ),
        ],
      }),
      ih.pre(
        [ih.Class('overflow-x-auto p-4')],
        [
          ih.code(
            [ih.Class('font-mono text-sm text-stone-100')],
            [codeBlock.value],
          ),
        ],
      ),
    ],
  )

const listView = (list: Markdown.List, items: ReadonlyArray<Html>): Html => {
  const startAttributes = Option.match(list.maybeStartNumber, {
    onNone: () => [],
    onSome: startNumber => [ih.Start(startNumber)],
  })

  if (list.isOrdered) {
    return ih.ol(
      [...startAttributes, ih.Class('list-decimal space-y-1 pl-6')],
      items,
    )
  } else {
    return ih.ul([ih.Class('list-disc space-y-1 pl-6')], items)
  }
}

const alignmentClass = (alignment: Markdown.Alignment): string =>
  Match.value(alignment).pipe(
    Match.when('Right', () => 'text-right'),
    Match.when('Center', () => 'text-center'),
    Match.orElse(() => 'text-left'),
  )

const tableCellView = (
  _tableCell: Markdown.TableCell,
  content: Markdown.InlineContent,
  alignment: Markdown.Alignment,
  isHeader: boolean,
): Html => {
  const cellClass = `px-3 py-2 ${alignmentClass(alignment)}`

  if (isHeader) {
    return ih.th(
      [ih.Class(`${cellClass} font-semibold text-stone-900`)],
      content,
    )
  } else {
    return ih.td([ih.Class(`${cellClass} text-stone-700`)], content)
  }
}

export const blogViews: Markdown.Views = {
  ...Markdown.defaultViews,

  Heading: headingView,

  Paragraph: (_paragraph, content) =>
    ih.p([ih.Class('leading-relaxed text-stone-700')], content),

  Link: (link, content) =>
    ih.a(
      [
        ih.Href(link.url),
        ih.Class(
          'text-stone-900 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-900',
        ),
      ],
      content,
    ),

  InlineCode: inlineCode =>
    ih.code(
      [ih.Class('rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[0.9em]')],
      [inlineCode.value],
    ),

  CodeBlock: codeBlockView,

  List: listView,

  ListItem: (_listItem, blocks) =>
    ih.li([ih.Class('leading-relaxed text-stone-700')], blocks),

  Blockquote: (_blockquote, blocks) =>
    ih.blockquote(
      [ih.Class('space-y-4 border-l-4 border-stone-200 pl-4 text-stone-600')],
      blocks,
    ),

  ThematicBreak: () => ih.hr([ih.Class('my-8 border-stone-200')]),

  Table: (_table, headerRow, bodyRows) =>
    ih.div(
      [ih.Class('overflow-x-auto')],
      [
        ih.table(
          [ih.Class('w-full border-collapse text-sm')],
          [ih.thead([], [headerRow]), ih.tbody([], bodyRows)],
        ),
      ],
    ),

  TableRow: (_tableRow, cells) =>
    ih.tr([ih.Class('border-b border-stone-200')], cells),

  TableCell: tableCellView,
}

export const proseView = (
  document: Markdown.MarkdownDocument,
  islands: Markdown.Islands,
): Html =>
  ih.div(
    [ih.Class('space-y-5')],
    Markdown.viewBlocks(document, { islands, views: blogViews }),
  )
