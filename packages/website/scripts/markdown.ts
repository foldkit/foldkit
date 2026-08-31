import { Array, Option, Order, String, pipe } from 'effect'

import { type AppRoute } from '../src/route'
import { type PageMetadata } from './metadata'

// EXTRACTION

const SITE_URL = 'https://foldkit.dev'

const TEXT_NODE_TYPE = 3
const ELEMENT_NODE_TYPE = 1

const isElementNode = (node: Node): node is Element =>
  node.nodeType === ELEMENT_NODE_TYPE

export const extractMarkdownFromRenderedDocument = (
  renderedDocument: Document,
  siteUrl: string = SITE_URL,
): string => {
  const root = renderedDocument.querySelector('[data-pagefind-body]')
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
    if (node.nodeType === TEXT_NODE_TYPE) {
      return collapseWhitespace(node.textContent ?? '')
    }
    if (!isElementNode(node)) {
      return ''
    }
    if (isSkippedElement(node)) {
      return ''
    }
    const tag = node.tagName.toLowerCase()
    const inner = globalThis.Array.from(node.childNodes)
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
    const candidates = [
      element,
      ...globalThis.Array.from(element.querySelectorAll('*')),
    ]
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
    const labelCarrier = element.closest('[data-llm-label]')
    const label = labelCarrier?.getAttribute('data-llm-label') ?? ''
    const labelPrefix = label.length > 0 ? `**${label}**\n\n` : ''
    return `${labelPrefix}\`\`\`${language}\n${text}\n\`\`\``
  }

  const indentBlock = (text: string, indent: string): string =>
    text
      .split('\n')
      .map(line => (line.length === 0 ? line : `${indent}${line}`))
      .join('\n')

  const extractList = (element: Element, ordered: boolean): string => {
    const lines: globalThis.Array<string> = []
    let index = 1
    for (const child of globalThis.Array.from(element.children)) {
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
    const parts: globalThis.Array<string> = []
    for (const node of globalThis.Array.from(parent.childNodes)) {
      if (node.nodeType === TEXT_NODE_TYPE) {
        const text = collapseWhitespace(node.textContent ?? '').trim()
        if (text.length > 0) {
          parts.push(text)
        }
        continue
      }
      if (!isElementNode(node)) {
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

/**
 * Every section a page can report, in the order sections appear in `llms.txt`
 * and `llms-full.txt`. A section missing from this list ranks last, so adding a
 * new one here is part of adding it to {@link PageMetadata}.
 */
export const SECTION_ORDER: ReadonlyArray<string> = [
  'Docs',
  'Guides',
  'Core Concepts',
  'DevTools',
  'Best Practices',
  'Patterns',
  'Tooling',
  'FAQ',
  'Foldkit UI',
  'Testing',
  'Examples',
  'AI',
  'API Reference',
  'Blog',
  'Site',
]

const sectionRank = (section: string): number =>
  pipe(
    SECTION_ORDER,
    Array.findFirstIndex(candidate => candidate === section),
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
    Array.sortBy(titleOrder),
    Array.map(renderIndexEntry),
  )
  return `## ${section}\n\n${Array.join(lines, '\n')}`
}

const WHEN_TO_USE = `When to use Foldkit:

- Building a browser single-page application in TypeScript around The Elm Architecture: one Schema-defined Model, Messages as facts, a pure update function, and side effects confined to Commands.
- Extending a codebase that already uses Effect-TS, since Foldkit shares its idioms (Effect, Schema, Match, Option) and its ecosystem.
- Applications where agents write or audit significant code. Explicit state transitions and Messages-as-data make programs inspectable, and the Story and Scene test frameworks drive them without a browser.
- Not a fit for: server-only projects with no browser UI, teams staying on React and JSX idioms, or codebases avoiding the Effect ecosystem.

How an agent works with Foldkit:

- Scaffold a new application with \`npm create foldkit-app@latest\` (pnpm, yarn, and bun equivalents work too).
- Fetch any page below as Markdown by appending \`.md\` to its URL, or by requesting the page URL with \`Accept: text/markdown\`.
- Connect to a running app through the DevTools MCP server (\`npx @foldkit/devtools-mcp init\`) to inspect the Model, replay history, and dispatch Messages.
- Install the repository skills from ${SITE_URL}/ai/skills for architecture guidance, program generation, and application audits.`

const DEVELOPER_RESOURCES_SECTION = `## Developer Resources

- [llms-full.txt](${SITE_URL}/llms-full.txt): Every documentation page concatenated into one Markdown file.
- [Content API documentation](${SITE_URL}/api): The read-only JSON API for this site: endpoints, authentication, versioning and deprecation policy, rate limit headers, and the error model.
- [Content API service index](${SITE_URL}/api/v1): The endpoint list and policies as JSON. Pages, sections, examples, and blog posts hang off it.
- [openapi.json](${SITE_URL}/openapi.json): OpenAPI 3.1 description of this site's machine-readable content endpoints, with a typed schema for every response.
- [Sitemap](${SITE_URL}/sitemap.xml): Every page URL on the site.
- [AI overview](${SITE_URL}/ai/overview): How Foldkit's explicit architecture supports coding agents, and the resources available to them.
- [Agent skills](${SITE_URL}/ai/skills): Installable repository skills for architecture guidance, program generation, and application audits.
- [DevTools MCP server](${SITE_URL}/ai/mcp): Connect an agent to a running Foldkit application. Published on npm as @foldkit/devtools-mcp.
- [GitHub repository](https://github.com/foldkit/foldkit): Source code, issues, and discussions.
- [Blog RSS feed](${SITE_URL}/blog/rss.xml): Release announcements and deep dives.
- [About](${SITE_URL}/about): What Foldkit is, who builds it, and how it is released.
- [Contact](${SITE_URL}/contact): Issues, chat, security reports, and contributions.
- [Privacy](${SITE_URL}/privacy): What this site collects and what stays in your browser.`

export const buildLlmsIndex = (
  entries: ReadonlyArray<LlmsIndexEntry>,
): string => {
  const sectioned = pipe(
    entries,
    Array.filter(entry => entry.metadata.section.length > 0),
    Array.groupBy(entry => entry.metadata.section),
  )

  const sectionBlocks = pipe(
    Object.entries(sectioned),
    Array.sortBy(Order.mapInput(sectionOrder, ([section]) => section)),
    Array.map(([section, sectionEntries]) =>
      renderIndexSection(section, sectionEntries),
    ),
  )

  const header = `# Foldkit\n\n> ${SITE_BLURB}\n\nThis index lists every page on the Foldkit documentation site with a short description. Every page is also available as Markdown by appending \`.md\` to its URL (e.g. ${SITE_URL}/get-started/getting-started.md). A single-file concatenation of every page is available at ${SITE_URL}/llms-full.txt.\n\n${WHEN_TO_USE}`

  return `${header}\n\n${DEVELOPER_RESOURCES_SECTION}\n\n${Array.join(sectionBlocks, '\n\n')}\n`
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
  const trimmed = String.trim(entry.markdown)
  return `${sourceLine}\n${sectionLine}\n${trimmed}`
}

export const buildLlmsFull = (
  entries: ReadonlyArray<LlmsFullEntry>,
  generatedDate: string,
): string => {
  const sections = pipe(
    entries,
    Array.sortBy(fullEntryOrder),
    Array.map(renderFullEntry),
  )
  const header = `# Foldkit Documentation\n\nGenerated ${generatedDate} from ${SITE_URL}\n\n${SITE_BLURB}`
  return `${header}\n\n---\n\n${Array.join(sections, '\n\n---\n\n')}\n`
}
