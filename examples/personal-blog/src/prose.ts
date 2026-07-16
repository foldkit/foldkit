import { Match as M, Option } from 'effect'
import { Html, html } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

const h = html()

const headingView = (
  heading: Markdown.Heading,
  content: Markdown.InlineContent,
): Html =>
  M.value(heading.level).pipe(
    M.when(1, () =>
      h.h1([h.Class('text-3xl font-bold text-stone-900')], content),
    ),
    M.when(2, () =>
      h.h2([h.Class('mt-10 text-2xl font-semibold text-stone-900')], content),
    ),
    M.when(3, () =>
      h.h3([h.Class('mt-8 text-xl font-semibold text-stone-900')], content),
    ),
    M.when(4, () =>
      h.h4([h.Class('mt-6 text-lg font-semibold text-stone-900')], content),
    ),
    M.when(5, () =>
      h.h5([h.Class('mt-6 font-semibold text-stone-900')], content),
    ),
    M.when(6, () =>
      h.h6([h.Class('mt-6 text-sm font-semibold text-stone-900')], content),
    ),
    M.exhaustive,
  )

const codeBlockView = (codeBlock: Markdown.CodeBlock): Html =>
  h.div(
    [h.Class('overflow-hidden rounded-lg bg-stone-900')],
    [
      ...Option.match(codeBlock.maybeLanguage, {
        onNone: () => [],
        onSome: language => [
          h.keyed('div')(
            'Language',
            [
              h.Class(
                'border-b border-stone-700 px-4 py-1.5 font-mono text-xs text-stone-400',
              ),
            ],
            [language],
          ),
        ],
      }),
      h.pre(
        [h.Class('overflow-x-auto p-4')],
        [
          h.code(
            [h.Class('font-mono text-sm text-stone-100')],
            [codeBlock.value],
          ),
        ],
      ),
    ],
  )

const listView = (list: Markdown.List, items: ReadonlyArray<Html>): Html => {
  const startAttributes = Option.match(list.maybeStartNumber, {
    onNone: () => [],
    onSome: startNumber => [h.Start(startNumber)],
  })

  if (list.isOrdered) {
    return h.ol(
      [...startAttributes, h.Class('list-decimal space-y-1 pl-6')],
      items,
    )
  } else {
    return h.ul([h.Class('list-disc space-y-1 pl-6')], items)
  }
}

const alignmentClass = (alignment: Markdown.Alignment): string =>
  M.value(alignment).pipe(
    M.when('Right', () => 'text-right'),
    M.when('Center', () => 'text-center'),
    M.orElse(() => 'text-left'),
  )

const tableCellView = (
  _tableCell: Markdown.TableCell,
  content: Markdown.InlineContent,
  alignment: Markdown.Alignment,
  isHeader: boolean,
): Html => {
  const cellClass = `px-3 py-2 ${alignmentClass(alignment)}`

  if (isHeader) {
    return h.th([h.Class(`${cellClass} font-semibold text-stone-900`)], content)
  } else {
    return h.td([h.Class(`${cellClass} text-stone-700`)], content)
  }
}

export const blogViews: Markdown.Views = {
  ...Markdown.defaultViews,

  Heading: headingView,

  Paragraph: (_paragraph, content) =>
    h.p([h.Class('leading-relaxed text-stone-700')], content),

  Link: (link, content) =>
    h.a(
      [
        h.Href(link.url),
        h.Class(
          'text-stone-900 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-900',
        ),
      ],
      content,
    ),

  InlineCode: inlineCode =>
    h.code(
      [h.Class('rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[0.9em]')],
      [inlineCode.value],
    ),

  CodeBlock: codeBlockView,

  List: listView,

  ListItem: (_listItem, blocks) =>
    h.li([h.Class('leading-relaxed text-stone-700')], blocks),

  Blockquote: (_blockquote, blocks) =>
    h.blockquote(
      [h.Class('space-y-4 border-l-4 border-stone-200 pl-4 text-stone-600')],
      blocks,
    ),

  ThematicBreak: () => h.hr([h.Class('my-8 border-stone-200')]),

  Table: (_table, headerRow, bodyRows) =>
    h.div(
      [h.Class('overflow-x-auto')],
      [
        h.table(
          [h.Class('w-full border-collapse text-sm')],
          [h.thead([], [headerRow]), h.tbody([], bodyRows)],
        ),
      ],
    ),

  TableRow: (_tableRow, cells) =>
    h.tr([h.Class('border-b border-stone-200')], cells),

  TableCell: tableCellView,
}

export const proseView = (
  document: Markdown.MarkdownDocument,
  islands: Markdown.Islands,
): Html =>
  h.div(
    [h.Class('space-y-5')],
    Markdown.viewBlocks(document, { islands, views: blogViews }),
  )
