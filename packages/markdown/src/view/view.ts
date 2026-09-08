import { Array, Match, Option, Record, Schema } from 'effect'
import { Html, inertHtml as ih } from 'foldkit/html'

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
  attributes: Readonly<globalThis.Record<string, string>>,
  content: ReadonlyArray<Html>,
  occurrenceIndex: number,
) => Html

/** Island views by directive name. */
export type Islands = Readonly<globalThis.Record<string, IslandView>>

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
 * rendered content alongside the node itself. Code blocks additionally receive
 * their zero-based occurrence index in document order so consumers can derive
 * stable per-instance identifiers.
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
  CodeBlock: (codeBlock: CodeBlock, occurrenceIndex: number) => Html
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
    onSome: title => [ih.Title(title)],
  })

const startAttribute = (maybeStartNumber: Option.Option<number>) =>
  Option.match(maybeStartNumber, {
    onNone: () => [],
    onSome: startNumber => [ih.Start(startNumber)],
  })

const alignmentAttribute = (alignment: Alignment) =>
  Match.value(alignment).pipe(
    Match.when('None', () => []),
    Match.when('Left', () => [ih.Style({ 'text-align': 'left' })]),
    Match.when('Center', () => [ih.Style({ 'text-align': 'center' })]),
    Match.when('Right', () => [ih.Style({ 'text-align': 'right' })]),
    Match.exhaustive,
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
 *     ih.p([ih.Class('leading-relaxed text-stone-700')], content),
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
  InlineCode: ({ value }) => ih.code([], [value]),
  HardBreak: () => ih.br([]),
  Emphasis: (_emphasis, content) => ih.em([], content),
  Strong: (_strong, content) => ih.strong([], content),
  Strikethrough: (_strikethrough, content) => ih.del([], content),
  Link: ({ url, maybeTitle }, content) =>
    ih.a([ih.Href(url), ...titleAttribute(maybeTitle)], content),
  Image: ({ url, alt, maybeTitle }) =>
    ih.img([ih.Src(url), ih.Alt(alt), ...titleAttribute(maybeTitle)]),
  Heading: ({ level }, content) =>
    Match.value(level).pipe(
      Match.withReturnType<Html>(),
      Match.when(1, () => ih.h1([], content)),
      Match.when(2, () => ih.h2([], content)),
      Match.when(3, () => ih.h3([], content)),
      Match.when(4, () => ih.h4([], content)),
      Match.when(5, () => ih.h5([], content)),
      Match.when(6, () => ih.h6([], content)),
      Match.exhaustive,
    ),
  Paragraph: (_paragraph, content) => ih.p([], content),
  CodeBlock: ({ value }) => ih.pre([], [ih.code([], [value])]),
  List: ({ isOrdered, maybeStartNumber }, items) => {
    if (isOrdered) {
      return ih.ol(startAttribute(maybeStartNumber), items)
    } else {
      return ih.ul([], items)
    }
  },
  ListItem: (_listItem, blocks) => ih.li([], blocks),
  Blockquote: (_blockquote, blocks) => ih.blockquote([], blocks),
  ThematicBreak: () => ih.hr([]),
  Table: (_table, headerRow, bodyRows) =>
    ih.table([], [ih.thead([], [headerRow]), ih.tbody([], bodyRows)]),
  TableRow: (_tableRow, cells) => ih.tr([], cells),
  TableCell: (_tableCell, content, alignment, isHeader) => {
    if (isHeader) {
      return ih.th(alignmentAttribute(alignment), content)
    } else {
      return ih.td(alignmentAttribute(alignment), content)
    }
  },
}

const inlineView = (views: Views, inline: Inline): Html | string =>
  Match.value(inline).pipe(
    Match.withReturnType<Html | string>(),
    Match.tagsExhaustive({
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
    globalThis.Record<
      string,
      (
        attributes: unknown,
        content: ReadonlyArray<Html>,
        occurrenceIndex: number,
      ) => Html
    >
  >

  return Record.map(definitions, (attributesSchema, islandName) => {
    const decodeAttributes = Schema.decodeUnknownSync(attributesSchema)

    return (attributes, content, occurrenceIndex) =>
      Option.match(Record.get(islandViewsByName, islandName), {
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

type ViewState = Readonly<{
  islandOccurrenceCounts: Map<string, number>
  blockOccurrenceCounts: Map<Block['_tag'], number>
}>

const nextOccurrenceIndex = <Key>(
  occurrenceCounts: Map<Key, number>,
  key: Key,
): number => {
  const occurrenceIndex = occurrenceCounts.get(key) ?? 0
  occurrenceCounts.set(key, occurrenceIndex + 1)
  return occurrenceIndex
}

const islandView = (
  views: Views,
  islands: Islands,
  viewState: ViewState,
  island: Island,
): Html => {
  const occurrenceIndex = nextOccurrenceIndex(
    viewState.islandOccurrenceCounts,
    island.name,
  )

  return Option.match(Record.get(islands, island.name), {
    onNone: () => {
      warnMissingIslandOnce(island.name)
      return null
    },
    onSome: renderIsland =>
      renderIsland(
        island.attributes,
        Array.map(island.blocks, block =>
          blockView(views, islands, viewState, block),
        ),
        occurrenceIndex,
      ),
  })
}

const blockView = (
  views: Views,
  islands: Islands,
  viewState: ViewState,
  block: Block,
): Html =>
  Match.value(block).pipe(
    Match.withReturnType<Html>(),
    Match.tagsExhaustive({
      Heading: heading =>
        views.Heading(heading, inlineContent(views, heading.content)),
      Paragraph: paragraph =>
        views.Paragraph(paragraph, inlineContent(views, paragraph.content)),
      CodeBlock: codeBlock =>
        views.CodeBlock(
          codeBlock,
          nextOccurrenceIndex(viewState.blockOccurrenceCounts, codeBlock._tag),
        ),
      List: list =>
        views.List(
          list,
          Array.map(list.items, item =>
            views.ListItem(
              item,
              Array.map(item.blocks, child =>
                blockView(views, islands, viewState, child),
              ),
            ),
          ),
        ),
      Blockquote: blockquote =>
        views.Blockquote(
          blockquote,
          Array.map(blockquote.blocks, child =>
            blockView(views, islands, viewState, child),
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
      Island: island => islandView(views, islands, viewState, island),
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
  const viewState: ViewState = {
    islandOccurrenceCounts: new Map(),
    blockOccurrenceCounts: new Map(),
  }
  return Array.map(document.blocks, block =>
    blockView(views, islands, viewState, block),
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
): Html => ih.div([], viewBlocks(document, config))
