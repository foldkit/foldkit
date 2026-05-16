import { beforeEach, describe, expect, it } from 'vitest'

import {
  type LlmsFullEntry,
  type LlmsIndexEntry,
  buildLlmsFull,
  buildLlmsIndex,
  extractMarkdownFromCurrentDocument,
  shouldExportMarkdown,
  urlPathToMarkdownPath,
} from './markdown'

const SITE_URL = 'https://foldkit.dev'

const setBody = (html: string): void => {
  document.body.innerHTML = `<div data-pagefind-body>${html}</div>`
}

describe('extractMarkdownFromCurrentDocument', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('returns the empty string when no pagefind body is present', () => {
    document.body.innerHTML = '<div>orphaned content</div>'
    expect(extractMarkdownFromCurrentDocument(SITE_URL)).toBe('')
  })

  it('converts headings, paragraphs, and links', () => {
    setBody(`
      <h1>Getting Started</h1>
      <p>Welcome to <a href="/manifesto">Foldkit</a>.</p>
      <h2>Install</h2>
      <p>Run <code>pnpm create foldkit-app</code>.</p>
    `)

    expect(extractMarkdownFromCurrentDocument(SITE_URL)).toBe(
      `# Getting Started

Welcome to [Foldkit](https://foldkit.dev/manifesto).

## Install

Run \`pnpm create foldkit-app\`.`,
    )
  })

  it('preserves external link hrefs verbatim', () => {
    setBody(`<p>See <a href="https://example.com/x">the docs</a>.</p>`)
    expect(extractMarkdownFromCurrentDocument(SITE_URL)).toBe(
      'See [the docs](https://example.com/x).',
    )
  })

  it('emits fenced code blocks with the detected language', () => {
    setBody(`
      <pre><code class="language-typescript">const x = 1
const y = 2</code></pre>
    `)
    const markdown = extractMarkdownFromCurrentDocument(SITE_URL)
    expect(markdown).toContain('```typescript')
    expect(markdown).toContain('const x = 1\nconst y = 2')
    expect(markdown).toContain('```')
  })

  it('renders unordered lists with hyphen bullets', () => {
    setBody(`<ul><li>first</li><li>second</li><li>third</li></ul>`)
    expect(extractMarkdownFromCurrentDocument(SITE_URL)).toBe(
      '- first\n- second\n- third',
    )
  })

  it('renders ordered lists with numeric markers', () => {
    setBody(`<ol><li>one</li><li>two</li></ol>`)
    expect(extractMarkdownFromCurrentDocument(SITE_URL)).toBe('1. one\n2. two')
  })

  it('skips elements marked data-llm-ignore', () => {
    setBody(`
      <p>kept paragraph</p>
      <div data-llm-ignore>
        <p>nav junk</p>
      </div>
    `)
    expect(extractMarkdownFromCurrentDocument(SITE_URL)).toBe('kept paragraph')
  })

  it('does not skip elements marked only data-pagefind-ignore', () => {
    setBody(`
      <div data-pagefind-ignore>
        <pre><code class="language-typescript">const x = 1</code></pre>
      </div>
    `)
    expect(extractMarkdownFromCurrentDocument(SITE_URL)).toBe(
      '```typescript\nconst x = 1\n```',
    )
  })

  it('extracts source from shiki-tokenized code blocks', () => {
    setBody(
      `<pre class="shiki" data-language="typescript"><code><span class="line"><span style="color:#569cd6">const</span><span style="color:#9cdcfe"> x</span><span style="color:#d4d4d4"> =</span><span style="color:#b5cea8"> 1</span></span>\n<span class="line"><span style="color:#569cd6">const</span><span style="color:#9cdcfe"> y</span><span style="color:#d4d4d4"> =</span><span style="color:#b5cea8"> 2</span></span></code></pre>`,
    )
    expect(extractMarkdownFromCurrentDocument(SITE_URL)).toBe(
      '```typescript\nconst x = 1\nconst y = 2\n```',
    )
  })

  it('skips decorative svgs and buttons', () => {
    setBody(`
      <p>visible <svg><path d="M0,0"/></svg> text</p>
      <button>Copy</button>
    `)
    expect(extractMarkdownFromCurrentDocument(SITE_URL)).toBe('visible text')
  })

  it('collapses excess blank lines between blocks', () => {
    setBody(`
      <h2>A</h2>
      <p>one</p>
      <p>two</p>
      <h2>B</h2>
      <p>three</p>
    `)
    const markdown = extractMarkdownFromCurrentDocument(SITE_URL)
    expect(markdown).not.toMatch(/\n\n\n/)
  })
})

describe('urlPathToMarkdownPath', () => {
  it('maps root to index.md', () => {
    expect(urlPathToMarkdownPath('/')).toBe('index.md')
  })

  it('maps a top-level path to a sibling .md file', () => {
    expect(urlPathToMarkdownPath('/getting-started')).toBe('getting-started.md')
  })

  it('preserves nested paths', () => {
    expect(urlPathToMarkdownPath('/core/model')).toBe('core/model.md')
    expect(urlPathToMarkdownPath('/api/foldkit/html')).toBe(
      'api/foldkit/html.md',
    )
  })
})

describe('shouldExportMarkdown', () => {
  it('skips Playground, NotFound, and Newsletter routes', () => {
    expect(
      shouldExportMarkdown({ _tag: 'Playground', exampleSlug: 'counter' }),
    ).toBe(false)
    expect(shouldExportMarkdown({ _tag: 'NotFound', path: '/missing' })).toBe(
      false,
    )
    expect(shouldExportMarkdown({ _tag: 'Newsletter' })).toBe(false)
  })

  it('exports docs and api routes', () => {
    expect(shouldExportMarkdown({ _tag: 'GettingStarted' })).toBe(true)
    expect(shouldExportMarkdown({ _tag: 'CoreModel' })).toBe(true)
    expect(
      shouldExportMarkdown({ _tag: 'ApiModule', moduleSlug: 'html' }),
    ).toBe(true)
  })
})

const indexEntry = (
  urlPath: string,
  title: string,
  description: string,
  section: string,
): LlmsIndexEntry => ({
  urlPath,
  metadata: { title, description, section },
})

describe('buildLlmsIndex', () => {
  it('renders the site header and skips entries without a section', () => {
    const output = buildLlmsIndex([
      indexEntry('/', 'Foldkit', 'The home page.', ''),
      indexEntry(
        '/getting-started',
        'Getting Started',
        'Set up your first app.',
        'Docs',
      ),
    ])

    expect(output).toContain('# Foldkit')
    expect(output).toContain('> Foldkit is a TypeScript frontend framework')
    expect(output).toContain('## Docs')
    expect(output).toContain(
      '- [Getting Started](https://foldkit.dev/getting-started): Set up your first app.',
    )
    expect(output).not.toContain('The home page.')
  })

  it('orders sections by canonical rank and titles alphabetically', () => {
    const output = buildLlmsIndex([
      indexEntry('/ui/dialog', 'Dialog', 'Modal dialog.', 'Foldkit UI'),
      indexEntry('/ui/tabs', 'Tabs', 'Tab interface.', 'Foldkit UI'),
      indexEntry('/core/model', 'Model', 'Single state tree.', 'Core Concepts'),
      indexEntry('/manifesto', 'Manifesto', 'Why Foldkit exists.', 'Docs'),
    ])

    const docsIndex = output.indexOf('## Docs')
    const coreIndex = output.indexOf('## Core Concepts')
    const uiIndex = output.indexOf('## Foldkit UI')
    expect(docsIndex).toBeGreaterThan(-1)
    expect(coreIndex).toBeGreaterThan(docsIndex)
    expect(uiIndex).toBeGreaterThan(coreIndex)

    const dialogIndex = output.indexOf('[Dialog]')
    const tabsIndex = output.indexOf('[Tabs]')
    expect(dialogIndex).toBeLessThan(tabsIndex)
  })
})

const fullEntry = (
  urlPath: string,
  title: string,
  description: string,
  section: string,
  markdown: string,
  orderIndex: number,
): LlmsFullEntry => ({
  urlPath,
  metadata: { title, description, section },
  markdown,
  orderIndex,
})

describe('buildLlmsFull', () => {
  it('concatenates pages with source headers and separators', () => {
    const output = buildLlmsFull(
      [
        fullEntry(
          '/getting-started',
          'Getting Started',
          'Set up your first app.',
          'Docs',
          '# Getting Started\n\nWelcome.',
          0,
        ),
        fullEntry(
          '/core/model',
          'Model',
          'Single state tree.',
          'Core Concepts',
          '# Model\n\nOne tree.',
          1,
        ),
      ],
      '2026-05-16',
    )

    expect(output).toContain('# Foldkit Documentation')
    expect(output).toContain('Generated 2026-05-16 from https://foldkit.dev')
    expect(output).toContain('Source: https://foldkit.dev/getting-started')
    expect(output).toContain('Source: https://foldkit.dev/core/model')
    expect(output).toContain('Section: Docs')
    expect(output).toContain('Section: Core Concepts')
    expect(output).toContain('# Getting Started')
    expect(output).toContain('# Model')
    expect(output.split('\n---\n').length).toBeGreaterThan(1)
  })

  it('preserves orderIndex within a section instead of sorting alphabetically', () => {
    const output = buildLlmsFull(
      [
        fullEntry(
          '/core/update',
          'Update',
          'Pure transitions.',
          'Core Concepts',
          '# Update\n\nUpdate body.',
          2,
        ),
        fullEntry(
          '/core/architecture',
          'Architecture',
          'The shape of a Foldkit app.',
          'Core Concepts',
          '# Architecture\n\nArchitecture body.',
          0,
        ),
        fullEntry(
          '/core/model',
          'Model',
          'Single state tree.',
          'Core Concepts',
          '# Model\n\nModel body.',
          1,
        ),
      ],
      '2026-05-16',
    )

    const architectureAt = output.indexOf('# Architecture')
    const modelAt = output.indexOf('# Model')
    const updateAt = output.indexOf('# Update')
    expect(architectureAt).toBeLessThan(modelAt)
    expect(modelAt).toBeLessThan(updateAt)
  })
})
