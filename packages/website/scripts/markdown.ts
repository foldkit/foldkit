import {
  Array as Array_,
  Effect,
  Option,
  Order,
  String as Str,
  pipe,
} from 'effect'
import { type Page } from 'playwright'

import { type AppRoute } from '../src/route'
import { type PageMetadata } from './metadata'

// EXTRACTION

const SITE_URL = 'https://foldkit.dev'

export const extractMarkdownFromCurrentDocument = (siteUrl: string): string => {
  const root = document.querySelector('[data-pagefind-body]')
  if (root === null) {
    return ''
  }

  const SKIP_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'SVG',
    'NOSCRIPT',
    'BUTTON',
    'INPUT',
    'IFRAME',
  ])

  const isSkippedElement = (element: Element): boolean =>
    SKIP_TAGS.has(element.tagName) ||
    element.getAttribute('aria-hidden') === 'true' ||
    element.hasAttribute('data-llm-ignore')

  const collapseWhitespace = (text: string): string =>
    text.replace(/[\t\n\r ]+/g, ' ')

  const resolveHref = (href: string): string => {
    if (href.length === 0) {
      return ''
    }
    if (href.startsWith('/')) {
      return `${siteUrl}${href}`
    }
    return href
  }

  const collectInline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return collapseWhitespace(node.textContent ?? '')
    }
    if (!(node instanceof Element)) {
      return ''
    }
    if (isSkippedElement(node)) {
      return ''
    }
    const tag = node.tagName.toLowerCase()
    const inner = Array.from(node.childNodes)
      .map(collectInline)
      .join('')
      .replace(/ {2,}/g, ' ')

    switch (tag) {
      case 'a': {
        const href = node.getAttribute('href') ?? ''
        const trimmed = inner.trim()
        if (trimmed.length === 0) {
          return ''
        }
        return `[${trimmed}](${resolveHref(href)})`
      }
      case 'code': {
        const trimmed = inner.trim()
        return trimmed.length === 0 ? '' : `\`${trimmed}\``
      }
      case 'strong':
      case 'b': {
        const trimmed = inner.trim()
        return trimmed.length === 0 ? '' : `**${trimmed}**`
      }
      case 'em':
      case 'i': {
        const trimmed = inner.trim()
        return trimmed.length === 0 ? '' : `_${trimmed}_`
      }
      case 'br': {
        return ' '
      }
      default: {
        return inner
      }
    }
  }

  const detectLanguage = (element: Element): string => {
    const candidates = [element, ...Array.from(element.querySelectorAll('*'))]
    for (const candidate of candidates) {
      const className = candidate.getAttribute('class') ?? ''
      const match = className.match(/language-([\w+-]+)/)
      if (match !== null && match[1] !== undefined) {
        return match[1] === 'plaintext' ? '' : match[1]
      }
      const dataLang = candidate.getAttribute('data-language')
      if (dataLang !== null && dataLang.length > 0) {
        return dataLang === 'plaintext' ? '' : dataLang
      }
    }
    return ''
  }

  const extractCodeBlock = (element: Element): string => {
    const codeElement = element.querySelector('code')
    const source = codeElement ?? element
    const text = (source.textContent ?? '').replace(/\n+$/, '')
    const language = detectLanguage(element)
    return `\`\`\`${language}\n${text}\n\`\`\``
  }

  const indentBlock = (text: string, indent: string): string =>
    text
      .split('\n')
      .map(line => (line.length === 0 ? line : `${indent}${line}`))
      .join('\n')

  const extractList = (element: Element, ordered: boolean): string => {
    const lines: Array<string> = []
    let index = 1
    for (const child of Array.from(element.children)) {
      if (child.tagName !== 'LI') {
        continue
      }
      if (isSkippedElement(child)) {
        continue
      }
      const marker = ordered ? `${index}. ` : '- '
      const body = extractBlocks(child).trim()
      const indent = ' '.repeat(marker.length)
      const indented = body
        .split('\n')
        .map((line, lineIndex) =>
          lineIndex === 0 || line.length === 0 ? line : `${indent}${line}`,
        )
        .join('\n')
      lines.push(`${marker}${indented}`)
      if (ordered) {
        index += 1
      }
    }
    return lines.join('\n')
  }

  const extractBlocks = (parent: Element): string => {
    const parts: Array<string> = []
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = collapseWhitespace(node.textContent ?? '').trim()
        if (text.length > 0) {
          parts.push(text)
        }
        continue
      }
      if (!(node instanceof Element)) {
        continue
      }
      if (isSkippedElement(node)) {
        continue
      }
      const tag = node.tagName.toLowerCase()

      switch (tag) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6': {
          const level = Number(tag.slice(1))
          const inline = collectInline(node).trim()
          if (inline.length > 0) {
            parts.push(`${'#'.repeat(level)} ${inline}`)
          }
          break
        }
        case 'p': {
          const inline = collectInline(node).trim()
          if (inline.length > 0) {
            parts.push(inline)
          }
          break
        }
        case 'pre': {
          parts.push(extractCodeBlock(node))
          break
        }
        case 'ul': {
          const list = extractList(node, false)
          if (list.length > 0) {
            parts.push(list)
          }
          break
        }
        case 'ol': {
          const list = extractList(node, true)
          if (list.length > 0) {
            parts.push(list)
          }
          break
        }
        case 'blockquote': {
          const inner = extractBlocks(node).trim()
          if (inner.length > 0) {
            parts.push(indentBlock(inner, '> '))
          }
          break
        }
        case 'hr': {
          parts.push('---')
          break
        }
        case 'br': {
          break
        }
        case 'span':
        case 'em':
        case 'strong':
        case 'a':
        case 'code': {
          const inline = collectInline(node).trim()
          if (inline.length > 0) {
            parts.push(inline)
          }
          break
        }
        default: {
          const nested = extractBlocks(node)
          if (nested.length > 0) {
            parts.push(nested)
          }
          break
        }
      }
    }
    return parts.join('\n\n')
  }

  return extractBlocks(root)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const extractPageMarkdown = (page: Page): Effect.Effect<string, Error> =>
  Effect.tryPromise({
    try: () => page.evaluate(extractMarkdownFromCurrentDocument, SITE_URL),
    catch: error => new Error(`Failed to extract markdown: ${String(error)}`),
  })

// PATHS

export const urlPathToMarkdownPath = (urlPath: string): string =>
  urlPath === '/' ? 'index.md' : `${urlPath.slice(1)}.md`

// SKIP

const SKIPPED_ROUTE_TAGS: ReadonlySet<AppRoute['_tag']> = new Set([
  'Playground',
  'NotFound',
  'Newsletter',
])

export const shouldExportMarkdown = (route: AppRoute): boolean =>
  !SKIPPED_ROUTE_TAGS.has(route._tag)

// INDEX

export type LlmsIndexEntry = Readonly<{
  urlPath: string
  metadata: PageMetadata
}>

const SECTION_ORDER: ReadonlyArray<string> = [
  'Docs',
  'Guides',
  'Core Concepts',
  'Best Practices',
  'Patterns',
  'FAQ',
  'Foldkit UI',
  'Testing',
  'Examples',
  'AI',
  'API Reference',
]

const sectionRank = (section: string): number =>
  pipe(
    SECTION_ORDER,
    Array_.findFirstIndex(candidate => candidate === section),
    Option.getOrElse(() => SECTION_ORDER.length),
  )

const sectionOrder: Order.Order<string> = Order.mapInput(
  Order.Number,
  sectionRank,
)

const SITE_BLURB =
  'Foldkit is a TypeScript frontend framework built on Effect-TS that uses The Elm Architecture: a single Model, pure update, and side effects confined to Commands.'

const renderIndexEntry = (entry: LlmsIndexEntry): string =>
  `- [${entry.metadata.title}](${SITE_URL}${entry.urlPath}): ${entry.metadata.description}`

const titleOrder: Order.Order<LlmsIndexEntry> = Order.mapInput(
  Order.String,
  (entry: LlmsIndexEntry) => entry.metadata.title,
)

const renderIndexSection = (
  section: string,
  entries: ReadonlyArray<LlmsIndexEntry>,
): string => {
  const lines = pipe(
    entries,
    Array_.sortBy(titleOrder),
    Array_.map(renderIndexEntry),
  )
  return `## ${section}\n\n${Array_.join(lines, '\n')}`
}

export const buildLlmsIndex = (
  entries: ReadonlyArray<LlmsIndexEntry>,
): string => {
  const sectioned = pipe(
    entries,
    Array_.filter(entry => entry.metadata.section.length > 0),
    Array_.groupBy(entry => entry.metadata.section),
  )

  const sectionBlocks = pipe(
    Object.entries(sectioned),
    Array_.sortBy(Order.mapInput(sectionOrder, ([section]) => section)),
    Array_.map(([section, sectionEntries]) =>
      renderIndexSection(section, sectionEntries),
    ),
  )

  const header = `# Foldkit\n\n> ${SITE_BLURB}\n\nThis index lists every page on the Foldkit documentation site with a short description. Every page is also available as Markdown by appending \`.md\` to its URL (e.g. ${SITE_URL}/get-started/getting-started.md). A single-file concatenation of every page is available at ${SITE_URL}/llms-full.txt.`

  return `${header}\n\n${Array_.join(sectionBlocks, '\n\n')}\n`
}

// FULL

export type LlmsFullEntry = Readonly<{
  urlPath: string
  metadata: PageMetadata
  markdown: string
  orderIndex: number
}>

const sectionRankForEntry = (entry: LlmsFullEntry): number =>
  entry.metadata.section.length === 0 ? -1 : sectionRank(entry.metadata.section)

const fullEntryOrder: Order.Order<LlmsFullEntry> = Order.combine(
  Order.mapInput(Order.Number, sectionRankForEntry),
  Order.mapInput(Order.Number, (entry: LlmsFullEntry) => entry.orderIndex),
)

const renderFullEntry = (entry: LlmsFullEntry): string => {
  const sourceLine = `Source: ${SITE_URL}${entry.urlPath}`
  const sectionLine =
    entry.metadata.section.length === 0
      ? ''
      : `Section: ${entry.metadata.section}\n`
  const trimmed = Str.trim(entry.markdown)
  return `${sourceLine}\n${sectionLine}\n${trimmed}`
}

export const buildLlmsFull = (
  entries: ReadonlyArray<LlmsFullEntry>,
  generatedDate: string,
): string => {
  const sections = pipe(
    entries,
    Array_.sortBy(fullEntryOrder),
    Array_.map(renderFullEntry),
  )
  const header = `# Foldkit Documentation\n\nGenerated ${generatedDate} from ${SITE_URL}\n\n${SITE_BLURB}`
  return `${header}\n\n---\n\n${Array_.join(sections, '\n\n---\n\n')}\n`
}
