// SYNTAX TREE

/** Where a node starts in the source, 1-based. */
export type Position = Readonly<{ start: Readonly<{ line: number }> }>

type Positioned = Readonly<{ position?: Position | undefined }>

/**
 * A construct the parser recognizes but the markdown vocabulary leaves out. It
 * survives parsing only so normalization can reject it with guidance.
 */
export type Unsupported = Positioned &
  Readonly<{
    type:
      | 'html'
      | 'textDirective'
      | 'linkReference'
      | 'imageReference'
      | 'definition'
      | 'footnoteDefinition'
  }>

export type Text = Positioned & Readonly<{ type: 'text'; value: string }>

export type InlineCode = Positioned &
  Readonly<{ type: 'inlineCode'; value: string }>

export type Break = Positioned & Readonly<{ type: 'break' }>

export type Emphasis = Positioned &
  Readonly<{ type: 'emphasis'; children: ReadonlyArray<PhrasingContent> }>

export type Strong = Positioned &
  Readonly<{ type: 'strong'; children: ReadonlyArray<PhrasingContent> }>

export type Delete = Positioned &
  Readonly<{ type: 'delete'; children: ReadonlyArray<PhrasingContent> }>

export type Link = Positioned &
  Readonly<{
    type: 'link'
    url: string
    title: string | null
    children: ReadonlyArray<PhrasingContent>
  }>

export type Image = Positioned &
  Readonly<{ type: 'image'; url: string; alt: string; title: string | null }>

/** Inline content, as the parser reads it. */
export type PhrasingContent =
  | Text
  | InlineCode
  | Break
  | Emphasis
  | Strong
  | Delete
  | Link
  | Image
  | Unsupported

export type HeadingDepth = 1 | 2 | 3 | 4 | 5 | 6

export type Heading = Positioned &
  Readonly<{
    type: 'heading'
    depth: HeadingDepth
    children: ReadonlyArray<PhrasingContent>
  }>

export type Paragraph = Positioned &
  Readonly<{ type: 'paragraph'; children: ReadonlyArray<PhrasingContent> }>

export type Code = Positioned &
  Readonly<{
    type: 'code'
    lang: string | null
    meta: string | null
    value: string
  }>

export type ListItem = Positioned &
  Readonly<{
    type: 'listItem'
    checked: boolean | null
    children: ReadonlyArray<RootContent>
  }>

export type List = Positioned &
  Readonly<{
    type: 'list'
    ordered: boolean
    start: number | null
    children: ReadonlyArray<ListItem>
  }>

export type Blockquote = Positioned &
  Readonly<{ type: 'blockquote'; children: ReadonlyArray<RootContent> }>

export type ThematicBreak = Positioned & Readonly<{ type: 'thematicBreak' }>

export type TableCell = Positioned &
  Readonly<{ type: 'tableCell'; children: ReadonlyArray<PhrasingContent> }>

export type TableRow = Positioned &
  Readonly<{ type: 'tableRow'; children: ReadonlyArray<TableCell> }>

export type Table = Positioned &
  Readonly<{
    type: 'table'
    align: ReadonlyArray<'left' | 'right' | 'center' | null>
    children: ReadonlyArray<TableRow>
  }>

/** `::Name{attributes}`; a `[label]` arrives as its children. */
export type LeafDirective = Positioned &
  Readonly<{
    type: 'leafDirective'
    name: string
    attributes: Readonly<Record<string, string>>
    children: ReadonlyArray<PhrasingContent>
  }>

/** `:::Name{attributes}` through its closing fence; a `[label]` is its first paragraph. */
export type ContainerDirective = Positioned &
  Readonly<{
    type: 'containerDirective'
    name: string
    attributes: Readonly<Record<string, string>>
    children: ReadonlyArray<RootContent>
  }>

/** A leading `---` frontmatter block, its raw text in `value`. */
export type Yaml = Positioned & Readonly<{ type: 'yaml'; value: string }>

/** Block content, as the parser reads it. */
export type RootContent =
  | Heading
  | Paragraph
  | Code
  | List
  | Blockquote
  | ThematicBreak
  | Table
  | LeafDirective
  | ContainerDirective
  | Yaml
  | Unsupported

/** A parsed document, before normalization. */
export type Root = Readonly<{
  type: 'root'
  children: ReadonlyArray<RootContent>
}>
