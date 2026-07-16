import {
  Array,
  Match as M,
  Option,
  Record as Record_,
  Schema as S,
} from 'effect'
import type {
  ListItem as MdastListItem,
  Table as MdastTable,
  TableRow as MdastTableRow,
  PhrasingContent,
  Root,
  RootContent,
} from 'mdast'
import type {} from 'mdast-util-directive'
import type { Position } from 'unist'

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
import type { IslandDefinition, IslandDefinitions } from '../island/index.js'

/**
 * Options for {@link normalizeRoot}. `islands`, when provided, maps each
 * allowed directive name to the schema for its attributes; unknown names,
 * unknown attributes, and attribute values outside the schema all fail with
 * an error naming the offender.
 */
export type NormalizeOptions = Readonly<{
  islands?: IslandDefinitions | undefined
}>

type PositionedNode = Readonly<{
  type: string
  position?: Position | undefined
}>

type DirectiveNode = Readonly<{
  name: string
  attributes?:
    | Readonly<Record<string, string | null | undefined>>
    | null
    | undefined
  position?: Position | undefined
}>

const UNSUPPORTED_GUIDANCE: Readonly<Record<string, string>> = {
  html: 'Raw HTML is not part of the markdown vocabulary. Use an island directive to render custom views.',
  textDirective:
    'Inline directives are not supported. Use a leaf directive (`::Name`) on its own line, or a container directive (`:::Name`).',
  linkReference:
    'Reference-style links are not supported. Use an inline link (`[text](url)`).',
  imageReference:
    'Reference-style images are not supported. Use an inline image (`![alt](url)`).',
  definition:
    'Reference-style link definitions are not supported. Use inline links (`[text](url)`).',
  footnoteReference: 'Footnotes are not supported.',
  footnoteDefinition: 'Footnotes are not supported.',
  yaml: 'Frontmatter is not supported. Keep document metadata in application code, for example a typed post registry.',
  'leaf directive label':
    'Leaf directive labels (`::Name[label]`) are not supported. Pass information through attributes (`::Name{label="..."}`) instead.',
}

const sourceLocation = (
  node: Readonly<{ position?: Position | undefined }>,
): string => {
  const line = node.position?.start.line
  if (line === undefined) {
    return ''
  } else {
    return ` (line ${line})`
  }
}

const unsupported = (node: PositionedNode): never => {
  const guidance =
    UNSUPPORTED_GUIDANCE[node.type] ??
    'It is outside the @foldkit/markdown vocabulary.'
  throw new Error(
    `Unsupported markdown node "${node.type}"${sourceLocation(node)}. ${guidance}`,
  )
}

const normalizeAttributes = (
  attributes:
    | Readonly<Record<string, string | null | undefined>>
    | null
    | undefined,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(attributes ?? {}).map(([name, value]) => [
      name,
      value ?? '',
    ]),
  )

const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/
const SAFE_URL_SCHEME_PATTERN = /^(?:https?|mailto|tel):/i

// NOTE: The scheme check runs against the URL with ASCII control characters
// and spaces stripped, because browsers strip them too, so `java\tscript:`
// would otherwise smuggle an executable scheme past a plain prefix test.
const toSafeUrl = (
  node: Readonly<{ position?: Position | undefined }>,
  url: string,
): string => {
  const compactUrl = url.replace(/[\u0000-\u0020]/g, '')
  if (
    URL_SCHEME_PATTERN.test(compactUrl) &&
    !SAFE_URL_SCHEME_PATTERN.test(compactUrl)
  ) {
    throw new Error(
      `Unsupported URL scheme in "${url}"${sourceLocation(node)}. ` +
        'Link and image URLs may be relative, or use the http:, https:, mailto:, or tel: schemes.',
    )
  }
  return url
}

const toInline = (node: PhrasingContent): Inline =>
  M.value(node).pipe(
    M.withReturnType<Inline>(),
    M.discriminators('type')({
      text: ({ value }) => Text({ value }),
      inlineCode: ({ value }) => InlineCode({ value }),
      break: () => HardBreak(),
      emphasis: ({ children }) => Emphasis({ content: children.map(toInline) }),
      strong: ({ children }) => Strong({ content: children.map(toInline) }),
      delete: ({ children }) =>
        Strikethrough({ content: children.map(toInline) }),
      link: linkNode =>
        Link({
          url: toSafeUrl(linkNode, linkNode.url),
          maybeTitle: Option.fromNullishOr(linkNode.title),
          content: linkNode.children.map(toInline),
        }),
      image: imageNode =>
        Image({
          url: toSafeUrl(imageNode, imageNode.url),
          alt: imageNode.alt ?? '',
          maybeTitle: Option.fromNullishOr(imageNode.title),
        }),
    }),
    M.orElse(unsupported),
  )

const toAlignment = (align: 'left' | 'right' | 'center' | null): Alignment =>
  M.value(align).pipe(
    M.withReturnType<Alignment>(),
    M.when('left', () => 'Left'),
    M.when('center', () => 'Center'),
    M.when('right', () => 'Right'),
    M.orElse(() => 'None'),
  )

const toTableRow = (row: MdastTableRow): TableRow =>
  TableRow({
    cells: row.children.map(cell =>
      TableCell({ content: cell.children.map(toInline) }),
    ),
  })

/**
 * Converts a parsed mdast tree into a typed {@link MarkdownDocument}.
 * Throws on any node outside the markdown vocabulary.
 */
export const normalizeRoot = (
  root: Root,
  options: NormalizeOptions = {},
): MarkdownDocument => {
  const validateIslandAttributes = (
    directive: DirectiveNode,
    attributesSchema: IslandDefinition,
    attributes: Readonly<Record<string, string>>,
  ): void => {
    const allowedAttributeNames = Object.keys(attributesSchema.fields)
    const unknownAttributeNames = Object.keys(attributes).filter(
      attributeName => !allowedAttributeNames.includes(attributeName),
    )
    if (Array.isArrayNonEmpty(unknownAttributeNames)) {
      const allowedDescription = Array.match(allowedAttributeNames, {
        onEmpty: () => 'It takes no attributes.',
        onNonEmpty: names => `Allowed attributes: ${names.join(', ')}.`,
      })
      throw new Error(
        `Unknown attribute "${Array.headNonEmpty(unknownAttributeNames)}" for island "${directive.name}"${sourceLocation(directive)}. ` +
          allowedDescription,
      )
    }

    try {
      S.decodeUnknownSync(attributesSchema)(attributes)
    } catch (error) {
      throw new Error(
        `Invalid attributes for island "${directive.name}"${sourceLocation(directive)}. ` +
          `${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  const toIsland = (
    directive: DirectiveNode,
    blocks: ReadonlyArray<Block>,
  ): Island => {
    const attributes = normalizeAttributes(directive.attributes)
    const { islands } = options

    if (islands !== undefined) {
      Option.match(Record_.get(islands, directive.name), {
        onNone: () => {
          throw new Error(
            `Unknown island "${directive.name}"${sourceLocation(directive)}. ` +
              `Allowed islands: ${Object.keys(islands).join(', ')}.`,
          )
        },
        onSome: attributesSchema =>
          validateIslandAttributes(directive, attributesSchema, attributes),
      })
    }

    return Island({ name: directive.name, attributes, blocks })
  }

  const toListItem = (node: MdastListItem): ListItem => {
    if (node.checked === null || node.checked === undefined) {
      return ListItem({ blocks: node.children.map(toBlock) })
    } else {
      return unsupported({ type: 'task list item', position: node.position })
    }
  }

  const toTable = (node: MdastTable): Table =>
    Array.matchLeft(node.children.map(toTableRow), {
      onEmpty: () => unsupported(node),
      onNonEmpty: (headerRow, bodyRows) =>
        Table({
          alignments: (node.align ?? []).map(toAlignment),
          headerRow,
          bodyRows,
        }),
    })

  const toBlock = (node: RootContent): Block =>
    M.value(node).pipe(
      M.withReturnType<Block>(),
      M.discriminators('type')({
        heading: ({ depth, children }) =>
          Heading({ level: depth, content: children.map(toInline) }),
        paragraph: ({ children }) =>
          Paragraph({ content: children.map(toInline) }),
        code: ({ lang, meta, value }) =>
          CodeBlock({
            maybeLanguage: Option.fromNullishOr(lang),
            maybeMeta: Option.fromNullishOr(meta),
            value,
          }),
        list: listNode => {
          const items = listNode.children.map(toListItem)
          // Array.match?
          if (Array.isArrayNonEmpty(items)) {
            return List({
              isOrdered: listNode.ordered === true,
              maybeStartNumber: Option.fromNullishOr(listNode.start),
              items,
            })
          } else {
            return unsupported(listNode)
          }
        },
        blockquote: ({ children }) =>
          Blockquote({ blocks: children.map(toBlock) }),
        thematicBreak: () => ThematicBreak(),
        table: toTable,
        leafDirective: directive =>
          Array.match(directive.children, {
            onEmpty: () => toIsland(directive, []),
            onNonEmpty: () =>
              unsupported({
                type: 'leaf directive label',
                position: directive.position,
              }),
          }),
        containerDirective: directive =>
          toIsland(directive, directive.children.map(toBlock)),
      }),
      M.orElse(unsupported),
    )

  return { blocks: root.children.map(toBlock) }
}
