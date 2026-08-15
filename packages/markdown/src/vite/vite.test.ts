import { Option, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { decodeDocument, encodeDocument } from '../ast/index.js'
import {
  markdown,
  parseMarkdown,
  parseMarkdownWithFrontmatter,
} from './vite.js'
import type { MarkdownPluginOptions } from './vite.js'

const lines = (...sourceLines: ReadonlyArray<string>): string =>
  sourceLines.join('\n')

describe('parseMarkdown', () => {
  it('parses the core block vocabulary in document order', () => {
    const document = parseMarkdown(
      lines(
        '# Title',
        '',
        'A paragraph.',
        '',
        '> Quoted.',
        '',
        '- one',
        '- two',
        '',
        '---',
        '',
        '~~~ts twoslash',
        'const count = 1',
        '~~~',
      ),
    )

    expect(document.blocks.map(block => block._tag)).toStrictEqual([
      'Heading',
      'Paragraph',
      'Blockquote',
      'List',
      'ThematicBreak',
      'CodeBlock',
    ])
  })

  it('parses headings with their level and inline content', () => {
    const document = parseMarkdown('## Two words')

    expect(document.blocks).toStrictEqual([
      {
        _tag: 'Heading',
        level: 2,
        content: [{ _tag: 'Text', value: 'Two words' }],
      },
    ])
  })

  it('parses nested inline content', () => {
    const document = parseMarkdown(
      'Some *emphasis with `code`*, **strength**, ~~loss~~, and a [link](https://example.com "Example").',
    )

    expect(document.blocks).toStrictEqual([
      {
        _tag: 'Paragraph',
        content: [
          { _tag: 'Text', value: 'Some ' },
          {
            _tag: 'Emphasis',
            content: [
              { _tag: 'Text', value: 'emphasis with ' },
              { _tag: 'InlineCode', value: 'code' },
            ],
          },
          { _tag: 'Text', value: ', ' },
          { _tag: 'Strong', content: [{ _tag: 'Text', value: 'strength' }] },
          { _tag: 'Text', value: ', ' },
          {
            _tag: 'Strikethrough',
            content: [{ _tag: 'Text', value: 'loss' }],
          },
          { _tag: 'Text', value: ', and a ' },
          {
            _tag: 'Link',
            url: 'https://example.com',
            maybeTitle: Option.some('Example'),
            content: [{ _tag: 'Text', value: 'link' }],
          },
          { _tag: 'Text', value: '.' },
        ],
      },
    ])
  })

  it('parses images with alt text', () => {
    const document = parseMarkdown('![A film photograph](./photo.jpg)')

    expect(document.blocks).toStrictEqual([
      {
        _tag: 'Paragraph',
        content: [
          {
            _tag: 'Image',
            url: './photo.jpg',
            alt: 'A film photograph',
            maybeTitle: Option.none(),
          },
        ],
      },
    ])
  })

  it('captures code block language and meta from the opening fence', () => {
    const document = parseMarkdown(
      lines('~~~ts filename=main.ts', 'const count = 1', '~~~'),
    )

    expect(document.blocks).toStrictEqual([
      {
        _tag: 'CodeBlock',
        maybeLanguage: Option.some('ts'),
        maybeMeta: Option.some('filename=main.ts'),
        value: 'const count = 1',
      },
    ])
  })

  it('parses nested lists as block content of the parent item', () => {
    const document = parseMarkdown(
      lines('1. outer', '   - inner one', '   - inner two'),
    )

    expect(document.blocks).toStrictEqual([
      {
        _tag: 'List',
        isOrdered: true,
        maybeStartNumber: Option.some(1),
        items: [
          {
            _tag: 'ListItem',
            blocks: [
              {
                _tag: 'Paragraph',
                content: [{ _tag: 'Text', value: 'outer' }],
              },
              {
                _tag: 'List',
                isOrdered: false,
                maybeStartNumber: Option.none(),
                items: [
                  {
                    _tag: 'ListItem',
                    blocks: [
                      {
                        _tag: 'Paragraph',
                        content: [{ _tag: 'Text', value: 'inner one' }],
                      },
                    ],
                  },
                  {
                    _tag: 'ListItem',
                    blocks: [
                      {
                        _tag: 'Paragraph',
                        content: [{ _tag: 'Text', value: 'inner two' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  it('parses tables with per-column alignments and a header row', () => {
    const document = parseMarkdown(
      lines(
        '| Stock | Speed |',
        '| :--- | ---: |',
        '| Portra | 400 |',
        '| Ektar | 100 |',
      ),
    )

    expect(document.blocks).toStrictEqual([
      {
        _tag: 'Table',
        alignments: ['Left', 'Right'],
        headerRow: {
          _tag: 'TableRow',
          cells: [
            { _tag: 'TableCell', content: [{ _tag: 'Text', value: 'Stock' }] },
            { _tag: 'TableCell', content: [{ _tag: 'Text', value: 'Speed' }] },
          ],
        },
        bodyRows: [
          {
            _tag: 'TableRow',
            cells: [
              {
                _tag: 'TableCell',
                content: [{ _tag: 'Text', value: 'Portra' }],
              },
              { _tag: 'TableCell', content: [{ _tag: 'Text', value: '400' }] },
            ],
          },
          {
            _tag: 'TableRow',
            cells: [
              {
                _tag: 'TableCell',
                content: [{ _tag: 'Text', value: 'Ektar' }],
              },
              { _tag: 'TableCell', content: [{ _tag: 'Text', value: '100' }] },
            ],
          },
        ],
      },
    ])
  })

  it('parses a leaf directive into an island with attributes and no blocks', () => {
    const document = parseMarkdown('::Counter{label="Clicks"}')

    expect(document.blocks).toStrictEqual([
      {
        _tag: 'Island',
        name: 'Counter',
        attributes: { label: 'Clicks' },
        blocks: [],
      },
    ])
  })

  it('parses a container directive into an island with nested blocks', () => {
    const document = parseMarkdown(
      lines(':::Note', 'Nested *prose* inside.', ':::'),
    )

    expect(document.blocks).toStrictEqual([
      {
        _tag: 'Island',
        name: 'Note',
        attributes: {},
        blocks: [
          {
            _tag: 'Paragraph',
            content: [
              { _tag: 'Text', value: 'Nested ' },
              { _tag: 'Emphasis', content: [{ _tag: 'Text', value: 'prose' }] },
              { _tag: 'Text', value: ' inside.' },
            ],
          },
        ],
      },
    ])
  })

  it('round-trips through the JSON wire form', () => {
    const document = parseMarkdown(
      lines(
        '# Title',
        '',
        'Prose with a [link](https://example.com).',
        '',
        '3. starts at three',
        '',
        '::Counter{label="Clicks"}',
      ),
    )

    const wire: unknown = JSON.parse(JSON.stringify(encodeDocument(document)))

    expect(decodeDocument(wire)).toStrictEqual(document)
  })

  it('accepts declared islands and validates their attributes', () => {
    const document = parseMarkdown('::Counter{label="Clicks"}', {
      islands: { Counter: S.Struct({ label: S.optionalKey(S.String) }) },
    })

    expect(document.blocks.map(block => block._tag)).toStrictEqual(['Island'])
  })

  it('rejects non-schema island definitions from untyped callers', () => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const malformedOptions = {
      islands: { Counter: ['label'] },
    } as unknown as MarkdownPluginOptions

    expect(() => parseMarkdown('::Counter', malformedOptions)).toThrowError(
      'Island "Counter" in markdown plugin options must map to a Schema struct describing its attributes.',
    )
  })

  it('rejects island names missing from the declared islands', () => {
    expect(() =>
      parseMarkdown('::Conuter', {
        islands: { Counter: S.Struct({}), Note: S.Struct({}) },
      }),
    ).toThrowError(
      'Unknown island "Conuter" (line 1). Allowed islands: Counter, Note.',
    )
  })

  it('rejects attributes missing from the island schema', () => {
    expect(() =>
      parseMarkdown('::Counter{labl="Clicks"}', {
        islands: { Counter: S.Struct({ label: S.optionalKey(S.String) }) },
      }),
    ).toThrowError(
      'Unknown attribute "labl" for island "Counter" (line 1). Allowed attributes: label.',
    )
  })

  it('rejects attributes on islands that declare none', () => {
    expect(() =>
      parseMarkdown(lines(':::Note{tone="calm"}', 'Prose.', ':::'), {
        islands: { Note: S.Struct({}) },
      }),
    ).toThrowError(
      'Unknown attribute "tone" for island "Note" (line 1). It takes no attributes.',
    )
  })

  it('rejects attribute values outside the island schema', () => {
    expect(() =>
      parseMarkdown('::Counter', {
        islands: { Counter: S.Struct({ label: S.String }) },
      }),
    ).toThrowError(/Invalid attributes for island "Counter" \(line 1\)/)
  })

  it('rejects raw HTML blocks', () => {
    expect(() => parseMarkdown('<div>raw</div>')).toThrowError(
      /Unsupported markdown node "html" \(line 1\)/,
    )
  })

  it('rejects raw inline HTML', () => {
    expect(() => parseMarkdown('Some <em>raw</em> HTML.')).toThrowError(
      /Unsupported markdown node "html"/,
    )
  })

  it('rejects reference-style links', () => {
    expect(() =>
      parseMarkdown(
        lines('See [the docs][docs].', '', '[docs]: https://example.com'),
      ),
    ).toThrowError(/Reference-style links are not supported/)
  })

  it('rejects task list items', () => {
    expect(() => parseMarkdown('- [ ] pending')).toThrowError(
      /Unsupported markdown node "task list item" \(line 1\)/,
    )
  })

  it('rejects inline directives', () => {
    expect(() => parseMarkdown('An inline :Counter directive.')).toThrowError(
      /Inline directives are not supported/,
    )
  })

  it('rejects leaf directive labels', () => {
    expect(() => parseMarkdown('::Counter[Clicks while reading]')).toThrowError(
      /Leaf directive labels \(`::Name\[label\]`\) are not supported/,
    )
  })

  it('rejects executable URL schemes in links and images', () => {
    expect(() => parseMarkdown('[click](javascript:alert(1))')).toThrowError(
      /Unsupported URL scheme in "javascript:alert\(1\)" \(line 1\)/,
    )
    expect(() => parseMarkdown('[click](JaVaScRiPt:alert(1))')).toThrowError(
      /Unsupported URL scheme/,
    )
    expect(() =>
      parseMarkdown('[click](java&#9;script:alert(1))'),
    ).toThrowError(/Unsupported URL scheme/)
    expect(() =>
      parseMarkdown('![x](data:image/svg+xml,payload)'),
    ).toThrowError(/Unsupported URL scheme/)
  })

  it('accepts relative, fragment, and allowlisted absolute URLs', () => {
    const document = parseMarkdown(
      lines(
        '[relative](./posts)',
        '[fragment](#the-fold)',
        '[absolute](https://example.com)',
        '[email](mailto:devin@example.com)',
      ),
    )

    expect(document.blocks).toHaveLength(1)
  })

  it('rejects non-Struct island schemas', () => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const malformedOptions = {
      islands: { Counter: S.String },
    } as unknown as MarkdownPluginOptions

    expect(() => parseMarkdown('::Counter', malformedOptions)).toThrowError(
      'Island "Counter" in markdown plugin options must map to a Schema struct describing its attributes.',
    )
  })

  it('rejects YAML frontmatter when no frontmatter schema is configured', () => {
    expect(() =>
      parseMarkdown(lines('---', 'title: My Post', '---', '', 'Prose.')),
    ).toThrowError(/Frontmatter is not supported/)
  })
})

describe('parseMarkdownWithFrontmatter', () => {
  const frontmatterOptions: MarkdownPluginOptions = {
    frontmatter: S.Struct({
      title: S.String,
      date: S.optionalKey(S.String),
    }),
  }

  it('extracts validated frontmatter fields and drops the block from the document', () => {
    const { document, maybeFrontmatter } = parseMarkdownWithFrontmatter(
      lines('---', 'title: My Post', 'date: 2026-08-01', '---', '', 'Prose.'),
      frontmatterOptions,
    )

    expect(maybeFrontmatter).toStrictEqual(
      Option.some({ title: 'My Post', date: '2026-08-01' }),
    )
    expect(document.blocks.map(block => block._tag)).toStrictEqual([
      'Paragraph',
    ])
  })

  it('strips matching surrounding quotes from field values', () => {
    const { maybeFrontmatter } = parseMarkdownWithFrontmatter(
      lines('---', 'title: "Colons: allowed"', '---'),
      frontmatterOptions,
    )

    expect(maybeFrontmatter).toStrictEqual(
      Option.some({ title: 'Colons: allowed' }),
    )
  })

  it('returns no frontmatter for a document without a block', () => {
    const { maybeFrontmatter } = parseMarkdownWithFrontmatter(
      '# Title',
      frontmatterOptions,
    )

    expect(maybeFrontmatter).toStrictEqual(Option.none())
  })

  it('rejects entries that are not flat key: value pairs', () => {
    expect(() =>
      parseMarkdownWithFrontmatter(
        lines('---', 'tags:', '  - one', '---'),
        frontmatterOptions,
      ),
    ).toThrowError(/flat `key: value` pairs/)
  })

  it('parses field names shared with Object.prototype members', () => {
    const prototypeOptions: MarkdownPluginOptions = {
      frontmatter: S.Struct({ toString: S.String }),
    }

    const { maybeFrontmatter } = parseMarkdownWithFrontmatter(
      lines('---', 'toString: yes', '---'),
      prototypeOptions,
    )

    expect(maybeFrontmatter).toStrictEqual(Option.some({ toString: 'yes' }))
  })

  it('rejects duplicate fields', () => {
    expect(() =>
      parseMarkdownWithFrontmatter(
        lines('---', 'title: One', 'title: Two', '---'),
        frontmatterOptions,
      ),
    ).toThrowError(/Duplicate frontmatter field "title"/)
  })

  it('rejects fields outside the schema, naming the offending line', () => {
    expect(() =>
      parseMarkdownWithFrontmatter(
        lines('---', 'title: My Post', 'author: Devin', '---'),
        frontmatterOptions,
      ),
    ).toThrowError(
      /Unknown frontmatter field "author" \(line 3\)\. Allowed fields: title, date\./,
    )
  })

  it('rejects values the schema does not accept, naming the offending line', () => {
    const strictOptions: MarkdownPluginOptions = {
      frontmatter: S.Struct({
        title: S.String,
        count: S.NumberFromString.check(S.isFinite()),
      }),
    }

    expect(() =>
      parseMarkdownWithFrontmatter(
        lines('---', 'title: My Post', 'count: not-a-number', '---'),
        strictOptions,
      ),
    ).toThrowError(/Invalid frontmatter \(line 3\)/)
  })

  it('rejects a document missing required fields', () => {
    expect(() =>
      parseMarkdownWithFrontmatter(
        lines('---', 'date: 2026-08-01', '---'),
        frontmatterOptions,
      ),
    ).toThrowError(/Invalid frontmatter/)
  })

  it('rejects a non-Struct frontmatter schema', () => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const malformedOptions = {
      frontmatter: S.String,
    } as unknown as MarkdownPluginOptions

    expect(() =>
      parseMarkdownWithFrontmatter('# Title', malformedOptions),
    ).toThrowError(
      'The `frontmatter` markdown plugin option must be a Schema struct describing the frontmatter fields.',
    )
  })
})

describe('markdown', () => {
  const runTransform = (
    source: string,
    id: string,
    options: MarkdownPluginOptions = {
      islands: { Counter: S.Struct({ label: S.optionalKey(S.String) }) },
    },
  ) => {
    const plugin = markdown(options)
    if (typeof plugin.transform !== 'function') {
      throw new Error('Expected the plugin transform hook to be a function')
    }
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const transform = plugin.transform as unknown as (
      source: string,
      id: string,
    ) => Readonly<{ code: string }> | undefined
    return transform(source, id)
  }

  it('compiles .md modules into a decodable encoded default export', () => {
    const result = runTransform('# Title', '/site/src/content/about.md')

    if (result === undefined) {
      throw new Error('Expected the transform to compile the .md module')
    }
    expect(result.code.startsWith('export default ')).toBe(true)

    const [documentLine = ''] = result.code.split('\n')
    const wire: unknown = JSON.parse(
      documentLine.slice('export default '.length),
    )
    expect(decodeDocument(wire).blocks.map(block => block._tag)).toStrictEqual([
      'Heading',
    ])
    expect(result.code).toContain('export const frontmatter = undefined')
  })

  it('emits validated frontmatter as a named export', () => {
    const frontmatterOptions: MarkdownPluginOptions = {
      frontmatter: S.Struct({ title: S.String }),
    }

    const withFrontmatter = runTransform(
      lines('---', 'title: My Post', '---', '', '# Title'),
      '/site/src/content/post.md',
      frontmatterOptions,
    )
    expect(withFrontmatter?.code).toContain(
      'export const frontmatter = {"title":"My Post"}',
    )

    const withoutFrontmatter = runTransform(
      '# Title',
      '/site/src/content/about.md',
      frontmatterOptions,
    )
    expect(withoutFrontmatter?.code).toContain(
      'export const frontmatter = undefined',
    )
  })

  it('leaves non-markdown modules untouched', () => {
    expect(runTransform('# Title', '/site/src/main.ts')).toBeUndefined()
    expect(
      runTransform('# Title', '/site/src/content/about.md.bak'),
    ).toBeUndefined()
  })
})
