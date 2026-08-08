import { Array, Option, Result, String as String_ } from 'effect'
import { inertHtml as ih } from 'foldkit/html'
import { describe, expect, test } from 'vitest'

import { parseMarkdown } from '@foldkit/markdown/vite'

import comingFromReactSource from '../page/comingFromReact/comingFromReact.md?raw'
import { FAQ_IDS } from '../page/comingFromReact/faq'
import commandsSource from '../page/core/commands.md?raw'
import submodelSource from '../page/core/submodel.md?raw'
import manifestoSource from '../page/manifesto.md?raw'
import { islandAttributes } from './islandAttributes'
import { slugify, stripHeadingIdMarker } from './slug'
import { collectHeadings } from './tableOfContents'

const tocOf = (source: string) =>
  collectHeadings(parseMarkdown(source, { islands: islandAttributes }))
    .tableOfContents

describe('slugify', () => {
  test('lowercases and dashes non-alphanumeric runs', () => {
    expect(slugify('HTTP Requests')).toBe('http-requests')
    expect(slugify('Commands with Args')).toBe('commands-with-args')
    expect(slugify('h.submodel')).toBe('h-submodel')
    expect(slugify('Build Your Product, Not Your Architecture')).toBe(
      'build-your-product-not-your-architecture',
    )
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

describe('proof pages', () => {
  test('manifesto table of contents', () => {
    expect(tocOf(manifestoSource)).toEqual([
      {
        level: 'h2',
        id: 'the-architecture-problem',
        text: 'The Architecture Problem',
      },
      {
        level: 'h2',
        id: 'power-through-constraints',
        text: 'Power Through Constraints',
      },
      { level: 'h2', id: 'readable-by-design', text: 'Readable by Design' },
      {
        level: 'h2',
        id: 'build-your-product-not-your-architecture',
        text: 'Build Your Product, Not Your Architecture',
      },
    ])
  })

  test('commands table of contents', () => {
    expect(tocOf(commandsSource)).toEqual([
      { level: 'h2', id: 'overview', text: 'Overview' },
      { level: 'h2', id: 'anatomy-of-a-command', text: 'Anatomy of a Command' },
      { level: 'h2', id: 'testable-by-design', text: 'Testable by Design' },
      { level: 'h2', id: 'http-requests', text: 'HTTP Requests' },
      { level: 'h2', id: 'commands-with-args', text: 'Commands with Args' },
      {
        level: 'h2',
        id: 'interrupting-commands',
        text: 'Interrupting Commands',
      },
      { level: 'h3', id: 'choosing-a-key', text: 'Choosing a Key' },
      {
        level: 'h3',
        id: 'the-interrupt-constructor',
        text: 'The Interrupt Constructor',
      },
      {
        level: 'h3',
        id: 'replacing-cancelled-work',
        text: 'Replacing Cancelled Work',
      },
      {
        level: 'h3',
        id: 'cancellations-with-multiple-meanings',
        text: 'Cancellations with Multiple Meanings',
      },
    ])
  })

  test('submodel table of contents', () => {
    expect(tocOf(submodelSource)).toEqual([
      { level: 'h2', id: 'overview', text: 'Overview' },
      { level: 'h2', id: 'child-submodel', text: 'The Child Submodel' },
      { level: 'h2', id: 'embedding', text: 'Embedding the Submodel' },
      { level: 'h3', id: 'embedding-the-model', text: 'Embedding the Model' },
      {
        level: 'h3',
        id: 'never-bypass-the-update',
        text: 'Never Bypass the Child’s Update',
      },
      { level: 'h3', id: 'wrapping-messages', text: 'Wrapping Messages' },
      { level: 'h3', id: 'delegating-in-update', text: 'Delegating in update' },
      {
        level: 'h3',
        id: 'fold-child',
        text: 'Folding with Update.foldChild',
      },
      {
        level: 'h3',
        id: 'wiring-the-view',
        text: 'Wiring the View with h.submodel',
      },
      {
        level: 'h3',
        id: 'per-render-view-inputs',
        text: 'Per-render View Inputs',
      },
      {
        level: 'h2',
        id: 'boundary-id-and-model-identity',
        text: 'Boundary Id and Model Identity',
      },
      { level: 'h2', id: 'multiple-instances', text: 'Multiple Instances' },
      {
        level: 'h2',
        id: 'memoization',
        text: 'Memoization Across Submodel Boundaries',
      },
      { level: 'h2', id: 'reading-parent-state', text: 'Reading Parent State' },
      {
        level: 'h3',
        id: 'parent-state-in-view',
        text: 'Passing Parent State to a Child Submodel’s view',
      },
      {
        level: 'h3',
        id: 'parent-state-in-update',
        text: 'Providing Parent State to a Child Submodel’s update',
      },
      {
        level: 'h2',
        id: 'surfacing-facts',
        text: 'Surfacing Facts to the Parent',
      },
      {
        level: 'h3',
        id: 'defining-out-messages',
        text: 'Defining OutMessages',
      },
      {
        level: 'h3',
        id: 'emitting-from-the-child',
        text: 'Emitting from the Child',
      },
      {
        level: 'h3',
        id: 'handling-in-the-parent',
        text: 'Handling in the Parent',
      },
      {
        level: 'h2',
        id: 'reflecting-external-state',
        text: 'Reflecting External State',
      },
      {
        level: 'h2',
        id: 'which-boundary',
        text: 'Which Boundary a Handler Dispatches Through',
      },
      { level: 'h2', id: 'child-attributes', text: 'childAttributes' },
      {
        level: 'h3',
        id: 'child-attributes-the-problem',
        text: 'The Problem',
      },
      {
        level: 'h3',
        id: 'child-attributes-how-it-works',
        text: 'How It Works',
      },
      {
        level: 'h3',
        id: 'child-attributes-when-to-reach',
        text: 'When to Reach For It',
      },
      { level: 'h2', id: 'testing-submodels', text: 'Testing Submodels' },
      {
        level: 'h2',
        id: 'debugging-in-devtools',
        text: 'Debugging Submodels in DevTools',
      },
      { level: 'h2', id: 'common-pitfalls', text: 'Common Pitfalls' },
      { level: 'h2', id: 'api-reference', text: 'API Reference' },
      { level: 'h3', id: 'api-h-submodel', text: 'h.submodel' },
      { level: 'h3', id: 'api-submodel-config', text: 'SubmodelConfig' },
      { level: 'h3', id: 'api-define-view', text: 'Submodel.defineView' },
      { level: 'h3', id: 'api-submodel-view', text: 'Submodel.View' },
      { level: 'h3', id: 'api-child-attributes', text: 'childAttributes' },
      { level: 'h3', id: 'api-child-attribute', text: 'ChildAttribute' },
    ])
  })

  test('coming from react table of contents', () => {
    expect(tocOf(comingFromReactSource)).toEqual([
      { level: 'h2', id: 'a-simple-counter', text: 'A Simple Counter' },
      { level: 'h2', id: 'adding-auto-count', text: 'Adding Auto-Count' },
      { level: 'h2', id: 'adding-a-step-size', text: 'Adding a Step Size' },
      {
        level: 'h2',
        id: 'translating-react-concepts',
        text: 'Translating React Concepts',
      },
      { level: 'h2', id: 'faq', text: 'FAQ' },
    ])
  })
})

const markdownSources = import.meta.glob('../page/**/*.md', {
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
        String(source).includes(':::Faq')
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
  const pageSources = import.meta.glob('../page/**/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  })

  const demoUsages = Array.filterMap(
    Object.entries(markdownSources),
    ([markdownPath, source]) => {
      const names = capturedNames(String(source), DEMO_ISLAND_PATTERN)

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
        expect(String(pageSource)).toContain(`'${name}'`)
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

const SNIPPET_EXTENSION_PATTERN = /\.(?:ts|tsx|elm|json|css)$/

describe('snippet island registration', () => {
  const snippetFileNames = new Set(
    Array.filterMap(
      Object.keys(import.meta.glob('../snippet/*.{ts,tsx,elm,json,css}')),
      path =>
        Result.fromOption(
          Option.map(Array.last(String_.split(path, '/')), fileName =>
            String_.replace(SNIPPET_EXTENSION_PATTERN, '')(fileName),
          ),
          () => undefined,
        ),
    ),
  )

  const snippetUsages = Array.filterMap(
    Object.entries(markdownSources),
    ([markdownPath, source]) => {
      const names = capturedNames(String(source), SNIPPET_ISLAND_PATTERN)

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
