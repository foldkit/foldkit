import { Array, Match, Option, Result, String } from 'effect'
import { inertHtml as ih } from 'foldkit/html'
import { describe, expect, test } from 'vitest'

import * as Markdown from '@foldkit/markdown'
import { parseMarkdown } from '@foldkit/markdown/vite'

import { type CodeBlock } from '../component'
import { PostFrontmatter } from '../page/blog/frontmatter'
import comingFromReactSource from '../page/comingFromReact/comingFromReact.md?raw'
import { FAQ_IDS } from '../page/comingFromReact/faq'
import comboboxPageSource from '../page/ui/comboboxPage.md?raw'
import { collectDemoLabels } from './demoLabel'
import { islandAttributes } from './islandAttributes'
import { docIslands } from './islands'
import { parseHeadingId, slugify, stripHeadingIdMarker } from './slug'
import { collectHeadings } from './tableOfContents'
import { docViews } from './views'

// NOTE: mirrors the options the website's markdown plugin runs with, so a check
// over every page's source reads the same documents the site builds.
const markdownOptions = {
  islands: islandAttributes,
  frontmatter: PostFrontmatter,
}

describe('slugify', () => {
  test('lowercases and dashes non-alphanumeric runs', () => {
    expect(slugify('HTTP Requests')).toBe('http-requests')
    expect(slugify('Commands with Args')).toBe('commands-with-args')
    expect(slugify('h.submodel')).toBe('h-submodel')
    expect(slugify('Build Your Product, Not Your Architecture')).toBe(
      'build-your-product-not-your-architecture',
    )
  })

  test('drops apostrophes instead of dashing them', () => {
    expect(slugify('Don’t Compute in Update')).toBe('dont-compute-in-update')
    expect(slugify("What's in it")).toBe('whats-in-it')
  })
})

describe('collectHeadings', () => {
  test('extracts h2–h4 with slug ids and excludes the h1 title', () => {
    const document = parseMarkdown(
      '# Title\n\n## First Section\n\n### A Detail\n\n## Second Section',
    )

    expect(collectHeadings(document).tableOfContents).toEqual([
      { level: 'h2', id: 'first-section', text: 'First Section' },
      { level: 'h3', id: 'a-detail', text: 'A Detail' },
      { level: 'h2', id: 'second-section', text: 'Second Section' },
    ])
  })

  test('deduplicates repeated heading slugs within a document', () => {
    const document = parseMarkdown('## Overview\n\n## Overview')

    expect(
      collectHeadings(document).tableOfContents.map(entry => entry.id),
    ).toEqual(['overview', 'overview-2'])
  })

  test('advances a generated suffix past an explicit {#id} to avoid collisions', () => {
    const document = parseMarkdown('## Foo\n\n## Foo {#foo-2}\n\n## Foo')

    expect(
      collectHeadings(document).tableOfContents.map(entry => entry.id),
    ).toEqual(['foo', 'foo-2', 'foo-3'])
  })

  test('honors a trailing {#id} override and strips it from the text', () => {
    const document = parseMarkdown(
      '## createLazy {#create-lazy}\n\n## When to Use Lazy Views {#when-to-use-lazy}',
    )

    expect(collectHeadings(document).tableOfContents).toEqual([
      { level: 'h2', id: 'create-lazy', text: 'createLazy' },
      { level: 'h2', id: 'when-to-use-lazy', text: 'When to Use Lazy Views' },
    ])
  })

  test('ignores a {#id} marker nested inside emphasis, keeping the id and text in agreement', () => {
    const document = parseMarkdown(
      '## **Use {#use}**\n\n## Plain heading {#plain}',
    )

    expect(collectHeadings(document).tableOfContents).toEqual([
      { level: 'h2', id: 'use-use', text: 'Use {#use}' },
      { level: 'h2', id: 'plain', text: 'Plain heading' },
    ])
  })

  test('ignores a {#id} marker nested inside inline code', () => {
    const document = parseMarkdown('## `code {#c}`')

    expect(collectHeadings(document).tableOfContents).toEqual([
      { level: 'h2', id: 'code-c', text: 'code {#c}' },
    ])
  })

  test('honors a trailing {#id} override that follows inline formatting', () => {
    const document = parseMarkdown('## Use **evo** {#use-evo}')

    expect(collectHeadings(document).tableOfContents).toEqual([
      { level: 'h2', id: 'use-evo', text: 'Use evo' },
    ])
  })
})

describe('stripHeadingIdMarker', () => {
  test('strips a trailing {#id} marker from plain heading text', () => {
    expect(stripHeadingIdMarker(['createLazy {#create-lazy}'])).toEqual([
      'createLazy',
    ])
  })

  test('preserves inline formatting and drops the marker-only trailing text', () => {
    const emphasis = ih.span([], ['lazy'])

    expect(stripHeadingIdMarker([emphasis, ' {#when-to-use-lazy}'])).toEqual([
      emphasis,
    ])
  })

  test('leaves content without a marker untouched', () => {
    const code = ih.span([], ['createLazy'])

    expect(stripHeadingIdMarker(['Use ', code])).toEqual(['Use ', code])
  })
})

describe('Demo island', () => {
  test('accepts a ::Demo directive carrying a name', () => {
    expect(() =>
      parseMarkdown('::Demo{name="counter"}', { islands: islandAttributes }),
    ).not.toThrow()
  })

  test('rejects a ::Demo directive with no name', () => {
    expect(() =>
      parseMarkdown('::Demo', { islands: islandAttributes }),
    ).toThrow()
  })
})

describe('copy control identity', () => {
  test('uses structural occurrence indices for code blocks and snippets', () => {
    const document = parseMarkdown(
      '```ts\nconst first = 1\n```\n\n::Snippet{name="sceneLocators"}\n\n```ts\nconst second = 2\n```\n\n::Snippet{name="sceneLocators"}',
      { islands: islandAttributes },
    )
    const { idByHeading } = collectHeadings(document)
    const demoLabels = collectDemoLabels(document, idByHeading)
    const ids: Array<string> = []
    const renderCopyButton: CodeBlock.RenderCopyButton = config => {
      ids.push(config.id)
      return ih.empty
    }
    const renderHeadingLink = () => ih.empty

    Markdown.view(document, {
      views: docViews({
        pageId: 'copy-identities',
        idByHeading,
        renderCopyButton,
        renderHeadingLink,
      }),
      islands: docIslands(
        { demos: {}, renderCopyButton, renderHeadingLink },
        demoLabels,
        'copy-identities',
      ),
    })

    expect(ids).toEqual([
      'copy-identities-code-0',
      'copy-identities-snippet-sceneLocators-0',
      'copy-identities-code-1',
      'copy-identities-snippet-sceneLocators-1',
    ])
  })
})

const markdownSources = import.meta.glob('../page/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const pageSources = import.meta.glob('../page/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const COMING_FROM_REACT_PATH = '../page/comingFromReact/comingFromReact.md'

const capturedNames = (
  source: string,
  pattern: RegExp,
): ReadonlyArray<string> =>
  Array.filterMap(Array.fromIterable(source.matchAll(pattern)), match =>
    Result.fromOption(Array.get(match, 1), () => undefined),
  )

// NOTE: the page keys each collapsible answer by the id in its markdown, so an
// id the page's own list does not know renders as plain prose instead of a
// collapsible section. This keeps the two lists in agreement.
const FAQ_ISLAND_ID_PATTERN = /:::Faq\{[^}]*id="([^"]+)"/g

describe('faq island registration', () => {
  const embeddedIds = capturedNames(
    comingFromReactSource,
    FAQ_ISLAND_ID_PATTERN,
  )

  test('the markdown embeds exactly the ids the page declares, in order', () => {
    expect(embeddedIds).toEqual([...FAQ_IDS])
  })

  test('no other page embeds a :::Faq island without a shell to render it', () => {
    const otherPagesWithFaqIslands = Array.filterMap(
      Object.entries(markdownSources),
      ([markdownPath, source]) =>
        markdownPath !== COMING_FROM_REACT_PATH &&
        globalThis.String(source).includes(':::Faq')
          ? Result.succeed(markdownPath)
          : Result.failVoid,
    )

    expect(otherPagesWithFaqIslands).toEqual([])
  })
})

// NOTE: the type of `slotDocPage<Name>` makes a page supply every demo name it
// declares, but the names in the markdown are data the compiler cannot see. This
// walks the other direction so a `::Demo` island can never name a demo its page
// module never declared.
const DEMO_ISLAND_PATTERN = /::Demo\{name="([^"]+)"\}/g

describe('demo island registration', () => {
  const demoUsages = Array.filterMap(
    Object.entries(markdownSources),
    ([markdownPath, source]) => {
      const names = capturedNames(
        globalThis.String(source),
        DEMO_ISLAND_PATTERN,
      )

      return Array.match(names, {
        onEmpty: () => Result.failVoid,
        onNonEmpty: presentNames =>
          Result.succeed({ markdownPath, names: presentNames }),
      })
    },
  )

  test('finds at least one ::Demo island to check', () => {
    expect(Array.isArrayNonEmpty(demoUsages)).toBe(true)
  })

  test.each(demoUsages)(
    '$markdownPath declares every demo its markdown embeds',
    ({ markdownPath, names }) => {
      const pagePath = markdownPath.replace(/\.md$/, '.ts')
      const pageSource = pageSources[pagePath]

      expect(pageSource, `no page module at ${pagePath}`).toBeDefined()

      for (const name of names) {
        expect(globalThis.String(pageSource)).toContain(`'${name}'`)
      }
    },
  )
})

// NOTE: `::Snippet` names cannot reach the same safety as `::Demo` names. The
// snippet registry is built from `import.meta.glob` at runtime and the name is
// markdown data, so the lookup cannot be made total the way the demo record is.
// This checks the same fact at test time instead. Globbing without `eager` reads
// only the file paths, which keeps the `?highlighted` modules out of the test's
// import graph.
const SNIPPET_ISLAND_PATTERN = /::Snippet\{[^}]*name="([^"]+)"/g

const SNIPPET_EXTENSION_PATTERN = /\.(?:ts|tsx|elm|json|css|html|sh)$/

describe('snippet island registration', () => {
  const snippetFileNames = new Set(
    Array.filterMap(
      Object.keys(
        import.meta.glob('../snippet/*.{ts,tsx,elm,json,css,html,sh}'),
      ),
      path =>
        Result.fromOption(
          Option.map(Array.last(String.split(path, '/')), fileName =>
            String.replace(SNIPPET_EXTENSION_PATTERN, '')(fileName),
          ),
          () => undefined,
        ),
    ),
  )

  const snippetUsages = Array.filterMap(
    Object.entries(markdownSources),
    ([markdownPath, source]) => {
      const names = capturedNames(
        globalThis.String(source),
        SNIPPET_ISLAND_PATTERN,
      )

      return Array.match(names, {
        onEmpty: () => Result.failVoid,
        onNonEmpty: presentNames =>
          Result.succeed({ markdownPath, names: presentNames }),
      })
    },
  )

  test('finds snippet files and ::Snippet islands to check', () => {
    expect(snippetFileNames.size).toBeGreaterThan(0)
    expect(Array.isArrayNonEmpty(snippetUsages)).toBe(true)
  })

  test.each(snippetUsages)(
    '$markdownPath references only snippets that exist',
    ({ markdownPath, names }) => {
      const missing = names.filter(name => !snippetFileNames.has(name))

      expect(missing, `${markdownPath} references missing snippets`).toEqual([])
    },
  )
})

type HeadingOverride = Readonly<{ id: string; text: string }>

const explicitHeadingIds = (source: string): ReadonlyArray<HeadingOverride> =>
  Array.filterMap(parseMarkdown(source, markdownOptions).blocks, block =>
    Match.value(block).pipe(
      Match.withReturnType<Result.Result<HeadingOverride, void>>(),
      Match.tag('Heading', heading => {
        const { maybeId, text } = parseHeadingId(heading.content)

        return Result.fromOption(
          Option.map(maybeId, id => ({ id, text })),
          () => undefined,
        )
      }),
      Match.orElse(() => Result.failVoid),
    ),
  )

// NOTE: a `{#id}` marker earns its place only when `slugify` would derive
// something else, such as kebab-casing an identifier or pinning a short anchor
// under a long heading. One that repeats the derived id reads as a convention
// the next heading has to follow, and it silently stops matching the heading the
// first time that heading is reworded.
describe('heading id overrides', () => {
  const overrideUsages = Array.filterMap(
    Object.entries(markdownSources),
    ([markdownPath, source]) =>
      Array.match(explicitHeadingIds(globalThis.String(source)), {
        onEmpty: () => Result.failVoid,
        onNonEmpty: overrides => Result.succeed({ markdownPath, overrides }),
      }),
  )

  test('finds heading id overrides to check', () => {
    expect(Array.isArrayNonEmpty(overrideUsages)).toBe(true)
  })

  test.each(overrideUsages)(
    '$markdownPath overrides only the ids slugify would not derive',
    ({ markdownPath, overrides }) => {
      const redundant = overrides.filter(({ id, text }) => id === slugify(text))

      expect(
        redundant,
        `${markdownPath} repeats the derived id in a {#id} marker`,
      ).toEqual([])
    },
  )
})

// NOTE: every demo sits under a heading, so each one renders as a region named
// by that heading. This walks the same documents the site builds and checks the
// pairing holds, since a demo that drifts above its heading loses its accessible
// name silently.
describe('demo section labels', () => {
  const labelUsages = Array.filterMap(
    Object.entries(markdownSources),
    ([markdownPath, source]) => {
      const names = capturedNames(
        globalThis.String(source),
        DEMO_ISLAND_PATTERN,
      )

      return Array.match(names, {
        onEmpty: () => Result.failVoid,
        onNonEmpty: presentNames =>
          Result.succeed({ markdownPath, names: presentNames, source }),
      })
    },
  )

  test('finds demo islands to check', () => {
    expect(Array.isArrayNonEmpty(labelUsages)).toBe(true)
  })

  test.each(labelUsages)(
    '$markdownPath labels every demo with the heading above it',
    ({ markdownPath, names, source }) => {
      const document = parseMarkdown(globalThis.String(source), markdownOptions)
      const demoLabels = collectDemoLabels(
        document,
        collectHeadings(document).idByHeading,
      )
      const unlabeled = names.filter(name => demoLabels.get(name) === undefined)

      expect(unlabeled, `${markdownPath} has demos with no heading`).toEqual([])
    },
  )

  test('labels the combobox demos with their own section headings', () => {
    const document = parseMarkdown(comboboxPageSource, markdownOptions)
    const demoLabels = collectDemoLabels(
      document,
      collectHeadings(document).idByHeading,
    )

    expect(Object.fromEntries(demoLabels)).toEqual({
      'single-select': 'single-select',
      nullable: 'nullable',
      'select-on-focus': 'select-on-focus',
      'locked-placement': 'locked-placement',
      multi: 'multi-select',
    })
  })
})
