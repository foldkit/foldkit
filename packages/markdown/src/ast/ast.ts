import { Option, Schema as S } from 'effect'
import type { Array } from 'effect'
import { ts } from 'foldkit/schema'

// INLINE

/** Plain text. */
export type Text = Readonly<{ _tag: 'Text'; value: string }>

/** Inline code span. */
export type InlineCode = Readonly<{ _tag: 'InlineCode'; value: string }>

/** Hard line break. */
export type HardBreak = Readonly<{ _tag: 'HardBreak' }>

/** Emphasized content, usually rendered as `em`. */
export type Emphasis = Readonly<{
  _tag: 'Emphasis'
  content: ReadonlyArray<Inline>
}>

/** Strongly emphasized content, usually rendered as `strong`. */
export type Strong = Readonly<{
  _tag: 'Strong'
  content: ReadonlyArray<Inline>
}>

/** Struck-through content, usually rendered as `del`. */
export type Strikethrough = Readonly<{
  _tag: 'Strikethrough'
  content: ReadonlyArray<Inline>
}>

/** Hyperlink with inline content. */
export type Link = Readonly<{
  _tag: 'Link'
  url: string
  maybeTitle: Option.Option<string>
  content: ReadonlyArray<Inline>
}>

/** Image with alt text. */
export type Image = Readonly<{
  _tag: 'Image'
  url: string
  alt: string
  maybeTitle: Option.Option<string>
}>

/** Any inline node. */
export type Inline =
  | Text
  | InlineCode
  | HardBreak
  | Emphasis
  | Strong
  | Strikethrough
  | Link
  | Image

/** The wire form of {@link Inline}, as emitted into compiled markdown modules. */
export type InlineEncoded =
  | Readonly<{ _tag: 'Text'; value: string }>
  | Readonly<{ _tag: 'InlineCode'; value: string }>
  | Readonly<{ _tag: 'HardBreak' }>
  | Readonly<{ _tag: 'Emphasis'; content: ReadonlyArray<InlineEncoded> }>
  | Readonly<{ _tag: 'Strong'; content: ReadonlyArray<InlineEncoded> }>
  | Readonly<{ _tag: 'Strikethrough'; content: ReadonlyArray<InlineEncoded> }>
  | Readonly<{
      _tag: 'Link'
      url: string
      maybeTitle: string | null | undefined
      content: ReadonlyArray<InlineEncoded>
    }>
  | Readonly<{
      _tag: 'Image'
      url: string
      alt: string
      maybeTitle: string | null | undefined
    }>

/** Schema for {@link Text}. */
export const Text = ts('Text', { value: S.String })

/** Schema for {@link InlineCode}. */
export const InlineCode = ts('InlineCode', { value: S.String })

/** Schema for {@link HardBreak}. */
export const HardBreak = ts('HardBreak')

// NOTE: Manual type definitions and the explicit annotation are required
// because TypeScript cannot infer types for self-recursive schemas built
// through S.suspend. Deriving the member types from their schemas instead
// (`type Emphasis = typeof Emphasis.Type`) recreates the circularity through
// the union alias and fails with TS2456, so the unions and their members stay
// hand-written.
/** Schema for {@link Inline}. */
export const Inline: S.Codec<Inline, InlineEncoded> = S.suspend(() =>
  S.Union([
    Text,
    InlineCode,
    HardBreak,
    Emphasis,
    Strong,
    Strikethrough,
    Link,
    Image,
  ]),
)

/** Schema for {@link Emphasis}. */
export const Emphasis = ts('Emphasis', { content: S.Array(Inline) })

/** Schema for {@link Strong}. */
export const Strong = ts('Strong', { content: S.Array(Inline) })

/** Schema for {@link Strikethrough}. */
export const Strikethrough = ts('Strikethrough', { content: S.Array(Inline) })

/** Schema for {@link Link}. */
export const Link = ts('Link', {
  url: S.String,
  maybeTitle: S.OptionFromNullishOr(S.String, { onNoneEncoding: null }),
  content: S.Array(Inline),
})

/** Schema for {@link Image}. */
export const Image = ts('Image', {
  url: S.String,
  alt: S.String,
  maybeTitle: S.OptionFromNullishOr(S.String, { onNoneEncoding: null }),
})

// BLOCK

/** Heading depth, `1` through `6`. */
export const HeadingLevel = S.Literals([1, 2, 3, 4, 5, 6])
export type HeadingLevel = typeof HeadingLevel.Type

/** Column alignment of a table, from the delimiter row of the source. */
export const Alignment = S.Literals(['None', 'Left', 'Center', 'Right'])
export type Alignment = typeof Alignment.Type

/** Section heading. */
export type Heading = Readonly<{
  _tag: 'Heading'
  level: HeadingLevel
  content: ReadonlyArray<Inline>
}>

/** Paragraph of inline content. */
export type Paragraph = Readonly<{
  _tag: 'Paragraph'
  content: ReadonlyArray<Inline>
}>

/** Fenced code block. `maybeMeta` carries everything after the language on the opening fence. */
export type CodeBlock = Readonly<{
  _tag: 'CodeBlock'
  maybeLanguage: Option.Option<string>
  maybeMeta: Option.Option<string>
  value: string
}>

/** Single list item holding block content, so lists nest. */
export type ListItem = Readonly<{
  _tag: 'ListItem'
  blocks: ReadonlyArray<Block>
}>

/** Ordered or unordered list. */
export type List = Readonly<{
  _tag: 'List'
  isOrdered: boolean
  maybeStartNumber: Option.Option<number>
  items: Array.NonEmptyReadonlyArray<ListItem>
}>

/** Block quotation holding block content. */
export type Blockquote = Readonly<{
  _tag: 'Blockquote'
  blocks: ReadonlyArray<Block>
}>

/** Thematic break, usually rendered as `hr`. */
export type ThematicBreak = Readonly<{ _tag: 'ThematicBreak' }>

/** Single table cell of inline content. */
export type TableCell = Readonly<{
  _tag: 'TableCell'
  content: ReadonlyArray<Inline>
}>

/** Single table row. */
export type TableRow = Readonly<{
  _tag: 'TableRow'
  cells: ReadonlyArray<TableCell>
}>

/** GFM table. The first source row is the header row. */
export type Table = Readonly<{
  _tag: 'Table'
  alignments: ReadonlyArray<Alignment>
  headerRow: TableRow
  bodyRows: ReadonlyArray<TableRow>
}>

/**
 * Directive node reserved for live application views. A leaf directive
 * (`::Name{attr="value"}`) has no blocks; a container directive
 * (`:::Name` ... `:::`) carries its nested markdown as blocks.
 */
export type Island = Readonly<{
  _tag: 'Island'
  name: string
  attributes: Readonly<Record<string, string>>
  blocks: ReadonlyArray<Block>
}>

/** Any block node. */
export type Block =
  | Heading
  | Paragraph
  | CodeBlock
  | List
  | Blockquote
  | ThematicBreak
  | Table
  | Island

/** The wire form of {@link ListItem}. */
export type ListItemEncoded = Readonly<{
  _tag: 'ListItem'
  blocks: ReadonlyArray<BlockEncoded>
}>

/** The wire form of {@link TableCell}. */
export type TableCellEncoded = Readonly<{
  _tag: 'TableCell'
  content: ReadonlyArray<InlineEncoded>
}>

/** The wire form of {@link TableRow}. */
export type TableRowEncoded = Readonly<{
  _tag: 'TableRow'
  cells: ReadonlyArray<TableCellEncoded>
}>

/** The wire form of {@link Block}, as emitted into compiled markdown modules. */
export type BlockEncoded =
  | Readonly<{
      _tag: 'Heading'
      level: HeadingLevel
      content: ReadonlyArray<InlineEncoded>
    }>
  | Readonly<{ _tag: 'Paragraph'; content: ReadonlyArray<InlineEncoded> }>
  | Readonly<{
      _tag: 'CodeBlock'
      maybeLanguage: string | null | undefined
      maybeMeta: string | null | undefined
      value: string
    }>
  | Readonly<{
      _tag: 'List'
      isOrdered: boolean
      maybeStartNumber: number | null | undefined
      items: Array.NonEmptyReadonlyArray<ListItemEncoded>
    }>
  | Readonly<{ _tag: 'Blockquote'; blocks: ReadonlyArray<BlockEncoded> }>
  | Readonly<{ _tag: 'ThematicBreak' }>
  | Readonly<{
      _tag: 'Table'
      alignments: ReadonlyArray<Alignment>
      headerRow: TableRowEncoded
      bodyRows: ReadonlyArray<TableRowEncoded>
    }>
  | Readonly<{
      _tag: 'Island'
      name: string
      attributes: Readonly<Record<string, string>>
      blocks: ReadonlyArray<BlockEncoded>
    }>

// NOTE: Manual type definitions and the explicit annotation are required
// because TypeScript cannot infer types for self-recursive schemas built
// through S.suspend. Deriving the member types from their schemas instead
// (`type Emphasis = typeof Emphasis.Type`) recreates the circularity through
// the union alias and fails with TS2456, so the unions and their members stay
// hand-written.
/** Schema for {@link Block}. */
export const Block: S.Codec<Block, BlockEncoded> = S.suspend(() =>
  S.Union([
    Heading,
    Paragraph,
    CodeBlock,
    List,
    Blockquote,
    ThematicBreak,
    Table,
    Island,
  ]),
)

/** Schema for {@link Heading}. */
export const Heading = ts('Heading', {
  level: HeadingLevel,
  content: S.Array(Inline),
})

/** Schema for {@link Paragraph}. */
export const Paragraph = ts('Paragraph', { content: S.Array(Inline) })

/** Schema for {@link CodeBlock}. */
export const CodeBlock = ts('CodeBlock', {
  maybeLanguage: S.OptionFromNullishOr(S.String, { onNoneEncoding: null }),
  maybeMeta: S.OptionFromNullishOr(S.String, { onNoneEncoding: null }),
  value: S.String,
})

/** Schema for {@link ListItem}. */
export const ListItem = ts('ListItem', { blocks: S.Array(Block) })

/** Schema for {@link List}. */
export const List = ts('List', {
  isOrdered: S.Boolean,
  maybeStartNumber: S.OptionFromNullishOr(S.Number, { onNoneEncoding: null }),
  items: S.NonEmptyArray(ListItem),
})

/** Schema for {@link Blockquote}. */
export const Blockquote = ts('Blockquote', { blocks: S.Array(Block) })

/** Schema for {@link ThematicBreak}. */
export const ThematicBreak = ts('ThematicBreak')

/** Schema for {@link TableCell}. */
export const TableCell = ts('TableCell', { content: S.Array(Inline) })

/** Schema for {@link TableRow}. */
export const TableRow = ts('TableRow', { cells: S.Array(TableCell) })

/** Schema for {@link Table}. */
export const Table = ts('Table', {
  alignments: S.Array(Alignment),
  headerRow: TableRow,
  bodyRows: S.Array(TableRow),
})

/** Schema for {@link Island}. */
export const Island = ts('Island', {
  name: S.String,
  attributes: S.Record(S.String, S.String),
  blocks: S.Array(Block),
})

// DOCUMENT

/** A compiled markdown document: the block sequence of one source file. */
export const MarkdownDocument = S.Struct({ blocks: S.Array(Block) })
export type MarkdownDocument = typeof MarkdownDocument.Type

/** The wire form of {@link MarkdownDocument}. */
export type MarkdownDocumentEncoded = typeof MarkdownDocument.Encoded

/**
 * Decodes the default export of a compiled markdown module into a typed
 * {@link MarkdownDocument}. Throws on input outside the markdown vocabulary.
 */
export const decodeDocument = S.decodeUnknownSync(MarkdownDocument)

/** Encodes a {@link MarkdownDocument} into its JSON-safe wire form. */
export const encodeDocument = S.encodeSync(MarkdownDocument)
