import { decodeNamedCharacterReference } from 'decode-named-character-reference'
import { Match } from 'effect'
import { Marked } from 'marked'
import type { MarkedToken, Token, TokenizerExtension, Tokens } from 'marked'

import type {
  HeadingDepth,
  ListItem,
  PhrasingContent,
  Position,
  Root,
  RootContent,
  TableRow,
  Text,
} from './syntax.js'

// ENTITIES

const CHARACTER_REFERENCE_PATTERN =
  /&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([A-Za-z][A-Za-z0-9]{1,31}));/g

const REPLACEMENT_CHARACTER = '�'

const toCodePointCharacter = (codePoint: number): string =>
  codePoint === 0 ||
  codePoint > 0x10ffff ||
  (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ? REPLACEMENT_CHARACTER
    : String.fromCodePoint(codePoint)

/** Decodes HTML character references the way CommonMark does. */
const decodeCharacterReferences = (value: string): string =>
  value.replace(
    CHARACTER_REFERENCE_PATTERN,
    (reference, decimal?: string, hexadecimal?: string, name?: string) => {
      if (name !== undefined) {
        const decoded = decodeNamedCharacterReference(name)
        return decoded === false ? reference : decoded
      } else if (decimal !== undefined) {
        return toCodePointCharacter(Number.parseInt(decimal, 10))
      } else {
        return toCodePointCharacter(Number.parseInt(hexadecimal ?? '', 16))
      }
    },
  )

// DIRECTIVES

// NOTE: Directive names follow micromark-extension-directive, which the
// previous remark pipeline used: any characters except whitespace, punctuation
// and symbols, with `-` and `_` allowed inside but not at the end. So `14:20`
// in prose is a text directive named `20`, and is rejected as before.
const DIRECTIVE_NAME = String.raw`[^\s\p{P}\p{S}](?:[^\s\p{P}\p{S}]|[-_])*(?<![-_])`
const DIRECTIVE_LABEL = String.raw`(?:\[([^\]\n]*)\])?`
const DIRECTIVE_ATTRIBUTES = String.raw`(?:\{([^}\n]*)\})?`

const CONTAINER_OPEN_PATTERN = new RegExp(
  String.raw`^ {0,3}(:{3,})(${DIRECTIVE_NAME})${DIRECTIVE_LABEL}${DIRECTIVE_ATTRIBUTES}[ \t]*(?:\n|$)`,
  'u',
)
const CONTAINER_START_PATTERN = new RegExp(
  String.raw`^ {0,3}:{3,}${DIRECTIVE_NAME}`,
  'mu',
)
const CONTAINER_CLOSE_PATTERN = /^ {0,3}:{3,}[ \t]*$/
const LEAF_PATTERN = new RegExp(
  String.raw`^ {0,3}::(${DIRECTIVE_NAME})${DIRECTIVE_LABEL}${DIRECTIVE_ATTRIBUTES}[ \t]*(?:\n|$)`,
  'u',
)
const LEAF_START_PATTERN = new RegExp(
  String.raw`^ {0,3}::${DIRECTIVE_NAME}`,
  'mu',
)
const TEXT_DIRECTIVE_PATTERN = new RegExp(`^:${DIRECTIVE_NAME}(?!:)`, 'u')
const TEXT_DIRECTIVE_START_PATTERN = /:[^\s\p{P}\p{S}]/u
const FOOTNOTE_DEFINITION_PATTERN = /^ {0,3}\[\^[^\]\s]+\]:[^\n]*(?:\n|$)/
const FOOTNOTE_DEFINITION_START_PATTERN = /^ {0,3}\[\^[^\]\s]+\]:/m

type ContainerDirectiveToken = Tokens.Generic &
  Readonly<{
    type: 'containerDirective'
    name: string
    label: string
    attributes: string | null
    tokens: Array<Token>
  }>

type LeafDirectiveToken = Tokens.Generic &
  Readonly<{
    type: 'leafDirective'
    name: string
    label: string
    attributes: string | null
  }>

type ContainerBody = Readonly<{ body: string; consumedLength: number }>

// NOTE: A closing fence ends the container even inside fenced code, as it did
// under remark-directive.
/**
 * The lines of a container directive up to the fence that closes it. Nested
 * containers open and close in pairs.
 */
const containerBody = (lines: ReadonlyArray<string>): ContainerBody => {
  const bodyLines: Array<string> = []
  let depth = 1
  let consumedLength = 0

  for (const line of lines) {
    consumedLength += line.length + 1

    if (CONTAINER_START_PATTERN.test(line)) {
      depth += 1
    } else if (CONTAINER_CLOSE_PATTERN.test(line)) {
      depth -= 1
      if (depth === 0) {
        return { body: bodyLines.join('\n'), consumedLength }
      }
    }

    bodyLines.push(line)
  }

  return { body: bodyLines.join('\n'), consumedLength }
}

const containerDirectiveExtension: TokenizerExtension = {
  name: 'containerDirective',
  level: 'block',
  start: source => CONTAINER_START_PATTERN.exec(source)?.index,
  tokenizer(source) {
    const maybeOpen = CONTAINER_OPEN_PATTERN.exec(source)
    if (maybeOpen === null) {
      return undefined
    }

    const [openLine, , name = '', label = '', attributes] = maybeOpen
    const { body, consumedLength } = containerBody(
      source.slice(openLine.length).split('\n'),
    )
    const token: ContainerDirectiveToken = {
      type: 'containerDirective',
      raw: source.slice(
        0,
        Math.min(openLine.length + consumedLength, source.length),
      ),
      name,
      label,
      attributes: attributes ?? null,
      tokens: [],
    }
    this.lexer.blockTokens(body, token.tokens)
    return token
  },
}

const leafDirectiveExtension: TokenizerExtension = {
  name: 'leafDirective',
  level: 'block',
  start: source => LEAF_START_PATTERN.exec(source)?.index,
  tokenizer(source) {
    const maybeLeaf = LEAF_PATTERN.exec(source)
    if (maybeLeaf === null) {
      return undefined
    }

    const [raw, name = '', label = '', attributes] = maybeLeaf
    const token: LeafDirectiveToken = {
      type: 'leafDirective',
      raw,
      name,
      label,
      attributes: attributes ?? null,
    }
    return token
  },
}

const textDirectiveExtension: TokenizerExtension = {
  name: 'textDirective',
  level: 'inline',
  start: source => TEXT_DIRECTIVE_START_PATTERN.exec(source)?.index,
  tokenizer(source, tokens) {
    const previousCharacter = tokens.at(-1)?.raw.at(-1)
    const maybeDirective = TEXT_DIRECTIVE_PATTERN.exec(source)
    if (maybeDirective === null || previousCharacter === ':') {
      return undefined
    }
    return { type: 'textDirective', raw: maybeDirective[0] }
  },
}

// NOTE: marked has no footnote support and would read a definition as a
// paragraph. Recognizing it keeps footnotes rejected as they were.
const footnoteDefinitionExtension: TokenizerExtension = {
  name: 'footnoteDefinition',
  level: 'block',
  start: source => FOOTNOTE_DEFINITION_START_PATTERN.exec(source)?.index,
  tokenizer(source) {
    const maybeDefinition = FOOTNOTE_DEFINITION_PATTERN.exec(source)
    if (maybeDefinition === null) {
      return undefined
    }
    return { type: 'footnoteDefinition', raw: maybeDefinition[0] }
  },
}

const markdown = new Marked({
  gfm: true,
  extensions: [
    footnoteDefinitionExtension,
    containerDirectiveExtension,
    leafDirectiveExtension,
    textDirectiveExtension,
  ],
})

const ATTRIBUTE_PATTERN =
  /([#.])([^\s"'<=>`#.}]+)|([A-Za-z_:][\w.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<=>`}]+)))?/g

/**
 * Parses `{key="value" key2=value #id .class}` the way remark-directive did:
 * `#id` sets `id`, each `.class` joins `class`, and a bare key is empty.
 */
const parseAttributes = (
  maybeSource: string | null,
): Readonly<Record<string, string>> => {
  if (maybeSource === null) {
    return {}
  }

  const attributes = new Map<string, string>()
  const classNames: Array<string> = []

  for (const [
    ,
    shorthand,
    shorthandValue = '',
    name,
    doubleQuoted,
    singleQuoted,
    unquoted,
  ] of maybeSource.matchAll(ATTRIBUTE_PATTERN)) {
    if (shorthand === '#') {
      attributes.set('id', decodeCharacterReferences(shorthandValue))
    } else if (shorthand === '.') {
      if (!attributes.has('class')) {
        attributes.set('class', '')
      }
      classNames.push(decodeCharacterReferences(shorthandValue))
    } else if (name !== undefined) {
      attributes.set(
        name,
        decodeCharacterReferences(
          doubleQuoted ?? singleQuoted ?? unquoted ?? '',
        ),
      )
    }
  }

  if (classNames.length > 0) {
    attributes.set(
      'class',
      [attributes.get('class'), ...classNames].filter(Boolean).join(' '),
    )
  }
  return Object.fromEntries(attributes)
}

// POSITIONS

type Locate = (raw: string) => Position

const countLineBreaks = (value: string): number => value.split('\n').length - 1

/**
 * Finds each child, in order, inside its parent's source, so a node reports
 * the line it starts on. List items and other containers strip indentation
 * from their children, so a child is found by its first line.
 */
const locator = (parentRaw: string, parentLine: number): Locate => {
  let cursor = 0
  let lastLine = parentLine

  return raw => {
    const firstLine = raw.split('\n')[0] ?? ''
    const index =
      firstLine.trim() === '' ? -1 : parentRaw.indexOf(firstLine.trim(), cursor)

    if (index >= 0) {
      lastLine = parentLine + countLineBreaks(parentRaw.slice(0, index))
      cursor = index + firstLine.trim().length
    }
    return { start: { line: lastLine } }
  }
}

// TOKENS

const MARKED_TOKEN_TYPES: ReadonlySet<string> = new Set<MarkedToken['type']>([
  'blockquote',
  'br',
  'checkbox',
  'code',
  'codespan',
  'def',
  'del',
  'em',
  'escape',
  'heading',
  'hr',
  'html',
  'image',
  'link',
  'list',
  'list_item',
  'paragraph',
  'space',
  'strong',
  'table',
  'text',
])

const isMarkedToken = (token: Token): token is MarkedToken =>
  MARKED_TOKEN_TYPES.has(token.type)

const isContainerDirectiveToken = (
  token: Token,
): token is ContainerDirectiveToken => token.type === 'containerDirective'

const isLeafDirectiveToken = (token: Token): token is LeafDirectiveToken =>
  token.type === 'leafDirective'

const isHeadingDepth = (depth: number): depth is HeadingDepth =>
  Number.isInteger(depth) && depth >= 1 && depth <= 6

// NOTE: Only `[text](destination)` is an inline link. A bracket followed by
// anything else is a reference, which marked resolves silently.
const isReference = (raw: string): boolean =>
  /^!?\[/.test(raw) && !/^!?\[[\s\S]*\]\(/.test(raw)

// NOTE: GFM email literals need a domain ending in a letter, so a version such
// as `effect@4.1.0` stays text. marked links it.
const isEmailLiteralWithoutLetterEnding = (link: Tokens.Link): boolean =>
  link.href.startsWith('mailto:') &&
  !/^[<[]/.test(link.raw) &&
  !/[A-Za-z]$/.test(link.raw)

/** A code span's content keeps its line endings; one padding space or line ending goes from each side. */
const codeSpanValue = (raw: string): string => {
  const fenceLength = /^`+/.exec(raw)?.[0].length ?? 0
  const content = raw.slice(fenceLength, raw.length - fenceLength)
  const isPadded =
    /^[ \n]/.test(content) && /[ \n]$/.test(content) && /[^ \n]/.test(content)
  return isPadded ? content.slice(1, -1) : content
}

const plainText = (tokens: ReadonlyArray<Token>): string =>
  tokens
    .map(token => {
      if ('tokens' in token && Array.isArray(token.tokens)) {
        return plainText(token.tokens)
      } else if (token.type === 'codespan') {
        return codeSpanValue(token.raw)
      } else if (token.type === 'br') {
        return '\n'
      } else if ('text' in token && typeof token.text === 'string') {
        return decodeCharacterReferences(token.text)
      } else {
        return ''
      }
    })
    .join('')

const isText = (node: PhrasingContent): node is Text => node.type === 'text'

/**
 * Merges adjacent text, drops spaces around soft line breaks, and trims the
 * ends of a block's inline content, as CommonMark does.
 */
const tidyPhrasing = (
  nodes: ReadonlyArray<PhrasingContent>,
): ReadonlyArray<PhrasingContent> => {
  const merged = nodes.reduce<Array<PhrasingContent>>((result, node) => {
    const previous = result.at(-1)
    if (isText(node) && previous !== undefined && isText(previous)) {
      result[result.length - 1] = {
        ...previous,
        value: previous.value + node.value,
      }
    } else {
      result.push(node)
    }
    return result
  }, [])

  const lastIndex = merged.length - 1
  return merged
    .map((node, index) => {
      if (!isText(node)) {
        return node
      }
      const withoutBreakSpaces = node.value.replace(/[ \t]*\n[ \t]*/g, '\n')
      const withoutLeadingSpaces =
        index === 0
          ? withoutBreakSpaces.replace(/^[ \t]+/, '')
          : withoutBreakSpaces
      const value =
        index === lastIndex
          ? withoutLeadingSpaces.replace(/[ \t]+$/, '')
          : withoutLeadingSpaces
      return { ...node, value }
    })
    .filter(node => !isText(node) || node.value !== '')
}

const toPhrasing = (
  tokens: ReadonlyArray<Token>,
  locate: Locate,
): ReadonlyArray<PhrasingContent> =>
  tokens.flatMap((token): ReadonlyArray<PhrasingContent> => {
    const position = locate(token.raw)

    if (token.type === 'textDirective') {
      return [{ type: 'textDirective', position }]
    } else if (!isMarkedToken(token)) {
      return [{ type: 'html', position }]
    }

    return Match.value(token).pipe(
      Match.withReturnType<ReadonlyArray<PhrasingContent>>(),
      Match.discriminators('type')({
        text: textToken =>
          'tokens' in textToken && textToken.tokens !== undefined
            ? toPhrasing(textToken.tokens, locate)
            : [
                {
                  type: 'text',
                  value: decodeCharacterReferences(textToken.text),
                  position,
                },
              ],
        escape: ({ text }) => [{ type: 'text', value: text, position }],
        codespan: ({ raw }) => [
          { type: 'inlineCode', value: codeSpanValue(raw), position },
        ],
        br: () => [{ type: 'break', position }],
        em: ({ tokens: children }) => [
          {
            type: 'emphasis',
            children: toPhrasing(children, locate),
            position,
          },
        ],
        strong: ({ tokens: children }) => [
          { type: 'strong', children: toPhrasing(children, locate), position },
        ],
        del: ({ tokens: children }) => [
          { type: 'delete', children: toPhrasing(children, locate), position },
        ],
        link: link => {
          if (isReference(link.raw)) {
            return [{ type: 'linkReference', position }]
          } else if (isEmailLiteralWithoutLetterEnding(link)) {
            return [{ type: 'text', value: link.raw, position }]
          } else {
            return [
              {
                type: 'link',
                url: decodeCharacterReferences(link.href),
                title:
                  link.title === null || link.title === undefined
                    ? null
                    : decodeCharacterReferences(link.title),
                children: toPhrasing(link.tokens, locate),
                position,
              },
            ]
          }
        },
        image: image =>
          isReference(image.raw)
            ? [{ type: 'imageReference', position }]
            : [
                {
                  type: 'image',
                  url: decodeCharacterReferences(image.href),
                  alt: plainText(image.tokens),
                  title:
                    image.title === null
                      ? null
                      : decodeCharacterReferences(image.title),
                  position,
                },
              ],
      }),
      Match.orElse(() => [{ type: 'html', position }]),
    )
  })

const toInlineContent = (
  tokens: ReadonlyArray<Token>,
  locate: Locate,
): ReadonlyArray<PhrasingContent> => tidyPhrasing(toPhrasing(tokens, locate))

const codeInfo = (
  maybeInfo: string | undefined,
): Readonly<{ lang: string | null; meta: string | null }> => {
  const info = decodeCharacterReferences((maybeInfo ?? '').trim())
  const [lang = ''] = info.split(/[ \t]+/)
  const meta = info.slice(lang.length).trim()
  return {
    lang: lang === '' ? null : lang,
    meta: meta === '' ? null : meta,
  }
}

const toTableRow = (
  cells: ReadonlyArray<Tokens.TableCell>,
  locate: Locate,
): TableRow => ({
  type: 'tableRow',
  children: cells.map(cell => ({
    type: 'tableCell',
    children: toInlineContent(cell.tokens, locate),
  })),
})

const toBlocks = (
  tokens: ReadonlyArray<Token>,
  locate: Locate,
): ReadonlyArray<RootContent> =>
  tokens.flatMap((token): ReadonlyArray<RootContent> => {
    const position = locate(token.raw)
    const locateChild = locator(token.raw, position.start.line)

    if (isContainerDirectiveToken(token)) {
      const label = toInlineContent(
        markdown.Lexer.lexInline(token.label),
        locateChild,
      )
      return [
        {
          type: 'containerDirective',
          name: token.name,
          attributes: parseAttributes(token.attributes),
          children: [
            ...(label.length > 0
              ? [{ type: 'paragraph' as const, children: label, position }]
              : []),
            ...toBlocks(token.tokens, locateChild),
          ],
          position,
        },
      ]
    } else if (isLeafDirectiveToken(token)) {
      return [
        {
          type: 'leafDirective',
          name: token.name,
          attributes: parseAttributes(token.attributes),
          children: toInlineContent(
            markdown.Lexer.lexInline(token.label),
            locateChild,
          ),
          position,
        },
      ]
    } else if (token.type === 'footnoteDefinition') {
      return [{ type: 'footnoteDefinition', position }]
    } else if (!isMarkedToken(token)) {
      return [{ type: 'html', position }]
    }

    return Match.value(token).pipe(
      Match.withReturnType<ReadonlyArray<RootContent>>(),
      Match.discriminators('type')({
        space: () => [],
        checkbox: () => [],
        heading: heading => [
          {
            type: 'heading',
            depth: isHeadingDepth(heading.depth) ? heading.depth : 6,
            children: toInlineContent(heading.tokens, locateChild),
            position,
          },
        ],
        paragraph: ({ tokens: children }) => [
          {
            type: 'paragraph',
            children: toInlineContent(children, locateChild),
            position,
          },
        ],
        text: textToken => [
          {
            type: 'paragraph',
            children: toInlineContent(
              textToken.tokens ?? [
                { type: 'text', raw: textToken.raw, text: textToken.text },
              ],
              locateChild,
            ),
            position,
          },
        ],
        code: code => [
          { type: 'code', ...codeInfo(code.lang), value: code.text, position },
        ],
        list: list => [
          {
            type: 'list',
            ordered: list.ordered,
            start:
              list.ordered && typeof list.start === 'number'
                ? list.start
                : null,
            children: list.items.map((item): ListItem => {
              const itemPosition = locateChild(item.raw)
              return {
                type: 'listItem',
                checked: item.task ? (item.checked ?? false) : null,
                children: toBlocks(
                  item.tokens,
                  locator(item.raw, itemPosition.start.line),
                ),
                position: itemPosition,
              }
            }),
            position,
          },
        ],
        blockquote: ({ tokens: children }) => [
          {
            type: 'blockquote',
            children: toBlocks(children, locateChild),
            position,
          },
        ],
        hr: () => [{ type: 'thematicBreak', position }],
        table: table => [
          {
            type: 'table',
            align: table.align,
            children: [
              toTableRow(table.header, locateChild),
              ...table.rows.map(row => toTableRow(row, locateChild)),
            ],
            position,
          },
        ],
        def: ({ tag }) => [
          {
            type: tag.startsWith('^') ? 'footnoteDefinition' : 'definition',
            position,
          },
        ],
      }),
      Match.orElse(() => [{ type: 'html', position }]),
    )
  })

// FRONTMATTER

const FRONTMATTER_PATTERN = /^---[ \t]*\n(?:([\s\S]*?)\n)?---[ \t]*(?:\n|$)/

/**
 * Parses markdown source (CommonMark with GFM tables, strikethrough, autolink
 * literals and task lists, plus leading frontmatter and directives) into the
 * syntax tree {@link normalizeRoot} reads.
 */
export const parseSource = (input: string): Root => {
  const normalizedInput = input.replace(/\r\n?/g, '\n')
  const maybeFrontmatter = FRONTMATTER_PATTERN.exec(normalizedInput)

  // NOTE: The frontmatter block becomes blank lines, so every line after it
  // keeps its number.
  const source =
    maybeFrontmatter === null
      ? normalizedInput
      : '\n'.repeat(countLineBreaks(maybeFrontmatter[0])) +
        normalizedInput.slice(maybeFrontmatter[0].length)

  const blocks = toBlocks(markdown.lexer(source), locator(source, 1))

  return {
    type: 'root',
    children:
      maybeFrontmatter === null
        ? blocks
        : [
            {
              type: 'yaml',
              value: maybeFrontmatter[1] ?? '',
              position: { start: { line: 1 } },
            },
            ...blocks,
          ],
  }
}
