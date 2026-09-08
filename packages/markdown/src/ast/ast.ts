import { Function, Option, Predicate, Schema } from 'effect'
import type { Array, SchemaAST } from 'effect'
import { taggedStruct } from 'foldkit/schema'

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
export const Text = taggedStruct('Text', { value: Schema.String })

/** Schema for {@link InlineCode}. */
export const InlineCode = taggedStruct('InlineCode', { value: Schema.String })

/** Schema for {@link HardBreak}. */
export const HardBreak = taggedStruct('HardBreak')

// NOTE: Manual type definitions and the explicit annotation are required
// because TypeScript cannot infer types for self-recursive schemas built
// through Schema.suspend. Deriving the member types from their schemas instead
// (`type Emphasis = typeof Emphasis.Type`) recreates the circularity through
// the union alias and fails with TS2456, so the unions and their members stay
// hand-written.
/** Schema for {@link Inline}. */
export const Inline: Schema.Codec<Inline, InlineEncoded> = Schema.suspend(() =>
  Schema.Union([
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
export const Emphasis = taggedStruct('Emphasis', {
  content: Schema.Array(Inline),
})

/** Schema for {@link Strong}. */
export const Strong = taggedStruct('Strong', { content: Schema.Array(Inline) })

/** Schema for {@link Strikethrough}. */
export const Strikethrough = taggedStruct('Strikethrough', {
  content: Schema.Array(Inline),
})

/** Schema for {@link Link}. */
export const Link = taggedStruct('Link', {
  url: Schema.String,
  maybeTitle: Schema.OptionFromNullishOr(Schema.String, {
    onNoneEncoding: null,
  }),
  content: Schema.Array(Inline),
})

/** Schema for {@link Image}. */
export const Image = taggedStruct('Image', {
  url: Schema.String,
  alt: Schema.String,
  maybeTitle: Schema.OptionFromNullishOr(Schema.String, {
    onNoneEncoding: null,
  }),
})

// BLOCK

/** Heading depth, `1` through `6`. */
export const HeadingLevel = Schema.Literals([1, 2, 3, 4, 5, 6])
export type HeadingLevel = typeof HeadingLevel.Type

/** Column alignment of a table, from the delimiter row of the source. */
export const Alignment = Schema.Literals(['None', 'Left', 'Center', 'Right'])
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
// through Schema.suspend. Deriving the member types from their schemas instead
// (`type Emphasis = typeof Emphasis.Type`) recreates the circularity through
// the union alias and fails with TS2456, so the unions and their members stay
// hand-written.
/** Schema for {@link Block}. */
export const Block: Schema.Codec<Block, BlockEncoded> = Schema.suspend(() =>
  Schema.Union([
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
export const Heading = taggedStruct('Heading', {
  level: HeadingLevel,
  content: Schema.Array(Inline),
})

/** Schema for {@link Paragraph}. */
export const Paragraph = taggedStruct('Paragraph', {
  content: Schema.Array(Inline),
})

/** Schema for {@link CodeBlock}. */
export const CodeBlock = taggedStruct('CodeBlock', {
  maybeLanguage: Schema.OptionFromNullishOr(Schema.String, {
    onNoneEncoding: null,
  }),
  maybeMeta: Schema.OptionFromNullishOr(Schema.String, {
    onNoneEncoding: null,
  }),
  value: Schema.String,
})

/** Schema for {@link ListItem}. */
export const ListItem = taggedStruct('ListItem', {
  blocks: Schema.Array(Block),
})

/** Schema for {@link List}. */
export const List = taggedStruct('List', {
  isOrdered: Schema.Boolean,
  maybeStartNumber: Schema.OptionFromNullishOr(Schema.Number, {
    onNoneEncoding: null,
  }),
  items: Schema.NonEmptyArray(ListItem),
})

/** Schema for {@link Blockquote}. */
export const Blockquote = taggedStruct('Blockquote', {
  blocks: Schema.Array(Block),
})

/** Schema for {@link ThematicBreak}. */
export const ThematicBreak = taggedStruct('ThematicBreak')

/** Schema for {@link TableCell}. */
export const TableCell = taggedStruct('TableCell', {
  content: Schema.Array(Inline),
})

/** Schema for {@link TableRow}. */
export const TableRow = taggedStruct('TableRow', {
  cells: Schema.Array(TableCell),
})

/** Schema for {@link Table}. */
export const Table = taggedStruct('Table', {
  alignments: Schema.Array(Alignment),
  headerRow: TableRow,
  bodyRows: Schema.Array(TableRow),
})

/** Schema for {@link Island}. */
export const Island = taggedStruct('Island', {
  name: Schema.String,
  attributes: Schema.Record(Schema.String, Schema.String),
  blocks: Schema.Array(Block),
})

// DOCUMENT

/** A compiled markdown document: the block sequence of one source file. */
export const MarkdownDocument = Schema.Struct({ blocks: Schema.Array(Block) })
export type MarkdownDocument = typeof MarkdownDocument.Type

/** The wire form of {@link MarkdownDocument}. */
export type MarkdownDocumentEncoded = typeof MarkdownDocument.Encoded

const decodeDocumentUncached = Schema.decodeUnknownSync(MarkdownDocument)

const documentByWire = new WeakMap<object, MarkdownDocument>()

/**
 * Decodes the default export of a compiled markdown module into a typed
 * {@link MarkdownDocument}. Throws on input outside the markdown vocabulary.
 *
 * Results are memoized on a `WeakMap` keyed by the wire object, so decoding the
 * same compiled module again returns the document from the first decode. A
 * module's wire object is immutable build output and the decode is
 * deterministic, so a cached document can never disagree with a fresh one, and
 * each entry is collected along with the module holding its key. Calling this
 * from a view costs one decode per module rather than one per render.
 *
 * Passing `overrideOptions` bypasses the cache both ways: the decode ignores
 * cached entries and its result is not stored, since a document decoded under
 * one set of options cannot answer for another.
 */
export const decodeDocument = (
  wire: unknown,
  overrideOptions?: SchemaAST.ParseOptions,
): MarkdownDocument => {
  if (overrideOptions === undefined && Predicate.isObject(wire)) {
    return Option.match(Option.fromNullishOr(documentByWire.get(wire)), {
      onNone: () => {
        const document = decodeDocumentUncached(wire)
        documentByWire.set(wire, document)
        return document
      },
      onSome: Function.identity,
    })
  } else {
    return decodeDocumentUncached(wire, overrideOptions)
  }
}

/** Encodes a {@link MarkdownDocument} into its JSON-safe wire form. */
export const encodeDocument = Schema.encodeSync(MarkdownDocument)
