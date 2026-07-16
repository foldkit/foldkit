import {
  Array,
  Match as M,
  Option,
  Record as Record_,
  Schema as S,
} from 'effect'
import { Html, html } from 'foldkit/html'

import {
  Alignment,
  Block,
  Blockquote,
  CodeBlock,
  Emphasis,
  HardBreak,
  Heading,
  Image,
  Inline,
  InlineCode,
  Island,
  Link,
  List,
  ListItem,
  MarkdownDocument,
  Paragraph,
  Strikethrough,
  Strong,
  Table,
  TableCell,
  TableRow,
  Text,
  ThematicBreak,
} from '../ast/index.js'
import type { IslandDefinitions } from '../island/index.js'

const h = html()

/** Rendered inline content, ready to pass as element children. */
export type InlineContent = ReadonlyArray<Html | string>

/**
 * Renders one island directive. Receives the directive's attributes, the
 * rendered nested blocks (empty for leaf directives), and the zero-based
 * occurrence of this island name in the document, in document order. Use the
 * occurrence index to derive identifiers that must be unique per instance,
 * such as an `h.submodel` slotId.
 */
export type IslandView = (
  attributes: Readonly<Record<string, string>>,
  content: ReadonlyArray<Html>,
  occurrenceIndex: number,
) => Html

/** Island views by directive name. */
export type Islands = Readonly<Record<string, IslandView>>

/**
 * One typed island view per definition. Each view receives its attributes
 * already decoded through the island's schema, so the record is exhaustive
 * over the declared island names by construction.
 */
export type IslandViewsFor<Definitions extends IslandDefinitions> = Readonly<{
  [Name in keyof Definitions]: (
    attributes: Definitions[Name]['Type'],
    content: ReadonlyArray<Html>,
    occurrenceIndex: number,
  ) => Html
}>

/**
 * One view function per markdown node. Container nodes receive their already
 * rendered content alongside the node itself.
 */
export type Views = Readonly<{
  Text: (text: Text) => Html | string
  InlineCode: (inlineCode: InlineCode) => Html
  HardBreak: (hardBreak: HardBreak) => Html
  Emphasis: (emphasis: Emphasis, content: InlineContent) => Html
  Strong: (strong: Strong, content: InlineContent) => Html
  Strikethrough: (strikethrough: Strikethrough, content: InlineContent) => Html
  Link: (link: Link, content: InlineContent) => Html
  Image: (image: Image) => Html
  Heading: (heading: Heading, content: InlineContent) => Html
  Paragraph: (paragraph: Paragraph, content: InlineContent) => Html
  CodeBlock: (codeBlock: CodeBlock) => Html
  List: (list: List, items: ReadonlyArray<Html>) => Html
  ListItem: (listItem: ListItem, blocks: ReadonlyArray<Html>) => Html
  Blockquote: (blockquote: Blockquote, blocks: ReadonlyArray<Html>) => Html
  ThematicBreak: (thematicBreak: ThematicBreak) => Html
  Table: (table: Table, headerRow: Html, bodyRows: ReadonlyArray<Html>) => Html
  TableRow: (tableRow: TableRow, cells: ReadonlyArray<Html>) => Html
  TableCell: (
    tableCell: TableCell,
    content: InlineContent,
    alignment: Alignment,
    isHeader: boolean,
  ) => Html
}>

/** Configuration for {@link view} and {@link viewBlocks}. */
export type ViewConfig = Readonly<{
  islands?: Islands | undefined
  views?: Partial<Views> | undefined
}>

const titleAttribute = (maybeTitle: Option.Option<string>) =>
  Option.match(maybeTitle, {
    onNone: () => [],
    onSome: title => [h.Title(title)],
  })

const startAttribute = (maybeStartNumber: Option.Option<number>) =>
  Option.match(maybeStartNumber, {
    onNone: () => [],
    onSome: startNumber => [h.Start(startNumber)],
  })

const alignmentAttribute = (alignment: Alignment) =>
  M.value(alignment).pipe(
    M.when('None', () => []),
    M.when('Left', () => [h.Style({ 'text-align': 'left' })]),
    M.when('Center', () => [h.Style({ 'text-align': 'center' })]),
    M.when('Right', () => [h.Style({ 'text-align': 'right' })]),
    M.exhaustive,
  )

/**
 * Unstyled semantic defaults for every markdown node. Spread these into your
 * own record and replace the nodes you want to restyle:
 *
 * @example
 * ```typescript
 * const blogViews: Markdown.Views = {
 *   ...Markdown.defaultViews,
 *   Paragraph: (paragraph, content) =>
 *     h.p([h.Class('leading-relaxed text-stone-700')], content),
 * }
 * ```
 */
// NOTE: These views deliberately render without vdom keys. A markdown document
// is immutable data, so a given position never switches branches within one
// document, and per-branch keys like 'Ordered' or 'Header' would repeat across
// sibling lists and cells, which corrupts snabbdom's keyed diff. Identity for a
// whole document belongs on the consumer's key around the rendered output.
export const defaultViews: Views = {
  Text: ({ value }) => value,
  InlineCode: ({ value }) => h.code([], [value]),
  HardBreak: () => h.br([]),
  Emphasis: (_emphasis, content) => h.em([], content),
  Strong: (_strong, content) => h.strong([], content),
  Strikethrough: (_strikethrough, content) => h.del([], content),
  Link: ({ url, maybeTitle }, content) =>
    h.a([h.Href(url), ...titleAttribute(maybeTitle)], content),
  Image: ({ url, alt, maybeTitle }) =>
    h.img([h.Src(url), h.Alt(alt), ...titleAttribute(maybeTitle)]),
  Heading: ({ level }, content) =>
    M.value(level).pipe(
      M.withReturnType<Html>(),
      M.when(1, () => h.h1([], content)),
      M.when(2, () => h.h2([], content)),
      M.when(3, () => h.h3([], content)),
      M.when(4, () => h.h4([], content)),
      M.when(5, () => h.h5([], content)),
      M.when(6, () => h.h6([], content)),
      M.exhaustive,
    ),
  Paragraph: (_paragraph, content) => h.p([], content),
  CodeBlock: ({ value }) => h.pre([], [h.code([], [value])]),
  List: ({ isOrdered, maybeStartNumber }, items) => {
    if (isOrdered) {
      return h.ol(startAttribute(maybeStartNumber), items)
    } else {
      return h.ul([], items)
    }
  },
  ListItem: (_listItem, blocks) => h.li([], blocks),
  Blockquote: (_blockquote, blocks) => h.blockquote([], blocks),
  ThematicBreak: () => h.hr([]),
  Table: (_table, headerRow, bodyRows) =>
    h.table([], [h.thead([], [headerRow]), h.tbody([], bodyRows)]),
  TableRow: (_tableRow, cells) => h.tr([], cells),
  TableCell: (_tableCell, content, alignment, isHeader) => {
    if (isHeader) {
      return h.th(alignmentAttribute(alignment), content)
    } else {
      return h.td(alignmentAttribute(alignment), content)
    }
  },
}

const inlineView = (views: Views, inline: Inline): Html | string =>
  M.value(inline).pipe(
    M.withReturnType<Html | string>(),
    M.tagsExhaustive({
      Text: views.Text,
      InlineCode: views.InlineCode,
      HardBreak: views.HardBreak,
      Emphasis: emphasis =>
        views.Emphasis(emphasis, inlineContent(views, emphasis.content)),
      Strong: strong =>
        views.Strong(strong, inlineContent(views, strong.content)),
      Strikethrough: strikethrough =>
        views.Strikethrough(
          strikethrough,
          inlineContent(views, strikethrough.content),
        ),
      Link: link => views.Link(link, inlineContent(views, link.content)),
      Image: views.Image,
    }),
  )

const inlineContent = (
  views: Views,
  content: ReadonlyArray<Inline>,
): InlineContent => Array.map(content, inline => inlineView(views, inline))

const alignmentAt = (
  alignments: ReadonlyArray<Alignment>,
  columnIndex: number,
): Alignment =>
  Option.getOrElse(Array.get(alignments, columnIndex), () => 'None')

const tableRowView = (
  views: Views,
  table: Table,
  row: TableRow,
  isHeader: boolean,
): Html =>
  views.TableRow(
    row,
    Array.map(row.cells, (cell, columnIndex) =>
      views.TableCell(
        cell,
        inlineContent(views, cell.content),
        alignmentAt(table.alignments, columnIndex),
        isHeader,
      ),
    ),
  )

// NOTE: Warns once per island name for the lifetime of the process, not per
// document, so a missing island in one document suppresses the warning for the
// same name in every later document. Per-render warnings would flood the
// console, since the fold runs on every Message dispatch.
const warnedInvalidAttributeIslandNames = new Set<string>()

const warnInvalidAttributesOnce = (
  islandName: string,
  detail: string,
): void => {
  if (!warnedInvalidAttributeIslandNames.has(islandName)) {
    warnedInvalidAttributeIslandNames.add(islandName)
    console.warn(
      `[@foldkit/markdown] Invalid attributes for island "${islandName}", so it renders nothing. ` +
        `Compile with the markdown plugin's islands option to catch this at build time. ${detail}`,
    )
  }
}

/**
 * Pairs island attribute schemas with typed views, producing the plain
 * {@link Islands} record the fold consumes. Attributes decode through each
 * island's schema before dispatch, and the views record must cover every
 * declared island name. Pass the same definitions to the markdown Vite
 * plugin's `islands` option so invalid directives fail the build instead of
 * reaching this decode.
 */
export const islandsFor = <const Definitions extends IslandDefinitions>(
  definitions: Definitions,
  islandViews: IslandViewsFor<Definitions>,
): Islands => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const islandViewsByName = islandViews as Readonly<
    Record<
      string,
      (
        attributes: unknown,
        content: ReadonlyArray<Html>,
        occurrenceIndex: number,
      ) => Html
    >
  >

  return Record_.map(definitions, (attributesSchema, islandName) => {
    const decodeAttributes = S.decodeUnknownSync(attributesSchema)

    return (attributes, content, occurrenceIndex) =>
      Option.match(Record_.get(islandViewsByName, islandName), {
        onNone: () => {
          warnMissingIslandOnce(islandName)
          return null
        },
        onSome: renderIsland => {
          try {
            return renderIsland(
              decodeAttributes(attributes),
              content,
              occurrenceIndex,
            )
          } catch (error) {
            warnInvalidAttributesOnce(
              islandName,
              error instanceof Error ? error.message : String(error),
            )
            return null
          }
        },
      })
  })
}

const warnedIslandNames = new Set<string>()

const warnMissingIslandOnce = (islandName: string): void => {
  if (!warnedIslandNames.has(islandName)) {
    warnedIslandNames.add(islandName)
    console.warn(
      `[@foldkit/markdown] No island view registered for "${islandName}", so it renders nothing. ` +
        'Add it to the islands record passed to Markdown.view.',
    )
  }
}

type IslandOccurrenceCounts = Map<string, number>

const islandView = (
  views: Views,
  islands: Islands,
  islandOccurrenceCounts: IslandOccurrenceCounts,
  island: Island,
): Html => {
  const occurrenceIndex = islandOccurrenceCounts.get(island.name) ?? 0
  islandOccurrenceCounts.set(island.name, occurrenceIndex + 1)

  return Option.match(Record_.get(islands, island.name), {
    onNone: () => {
      warnMissingIslandOnce(island.name)
      return null
    },
    onSome: renderIsland =>
      renderIsland(
        island.attributes,
        Array.map(island.blocks, block =>
          blockView(views, islands, islandOccurrenceCounts, block),
        ),
        occurrenceIndex,
      ),
  })
}

const blockView = (
  views: Views,
  islands: Islands,
  islandOccurrenceCounts: IslandOccurrenceCounts,
  block: Block,
): Html =>
  M.value(block).pipe(
    M.withReturnType<Html>(),
    M.tagsExhaustive({
      Heading: heading =>
        views.Heading(heading, inlineContent(views, heading.content)),
      Paragraph: paragraph =>
        views.Paragraph(paragraph, inlineContent(views, paragraph.content)),
      CodeBlock: views.CodeBlock,
      List: list =>
        views.List(
          list,
          Array.map(list.items, item =>
            views.ListItem(
              item,
              Array.map(item.blocks, child =>
                blockView(views, islands, islandOccurrenceCounts, child),
              ),
            ),
          ),
        ),
      Blockquote: blockquote =>
        views.Blockquote(
          blockquote,
          Array.map(blockquote.blocks, child =>
            blockView(views, islands, islandOccurrenceCounts, child),
          ),
        ),
      ThematicBreak: views.ThematicBreak,
      Table: table =>
        views.Table(
          table,
          tableRowView(views, table, table.headerRow, true),
          Array.map(table.bodyRows, row =>
            tableRowView(views, table, row, false),
          ),
        ),
      Island: island =>
        islandView(views, islands, islandOccurrenceCounts, island),
    }),
  )

/**
 * Folds a document into one Html node per top-level block. Use this when the
 * blocks should land directly inside your own container element.
 */
export const viewBlocks = (
  document: MarkdownDocument,
  config: ViewConfig = {},
): ReadonlyArray<Html> => {
  const views: Views = { ...defaultViews, ...config.views }
  const islands = config.islands ?? {}
  const islandOccurrenceCounts: IslandOccurrenceCounts = new Map()
  return Array.map(document.blocks, block =>
    blockView(views, islands, islandOccurrenceCounts, block),
  )
}

/**
 * Folds a document into a single Html tree. Every node renders through
 * {@link defaultViews} unless overridden in `config.views`, and every Island
 * directive renders through the matching entry in `config.islands`.
 */
export const view = (
  document: MarkdownDocument,
  config: ViewConfig = {},
): Html => h.div([], viewBlocks(document, config))
