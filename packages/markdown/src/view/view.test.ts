import { Schema } from 'effect'
import { type Html, inertHtml as ih } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { parseMarkdown } from '../vite/vite.js'
import { defaultViews, islandsFor, view } from './view.js'

const expectRendered = (
  rendered: Html,
  ...steps: ReadonlyArray<Scene.SceneStep<null, unknown, never>>
): void =>
  Scene.scene(
    { update: (model: null) => ({ model }), view: () => rendered },
    Scene.given(null),
    ...steps,
  )

const lines = (...sourceLines: ReadonlyArray<string>): string =>
  sourceLines.join('\n')

describe('view', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the default semantic elements in document order', () => {
    const document = parseMarkdown(
      lines('# Title', '', 'A paragraph.', '', '---'),
    )

    expectRendered(
      view(document),
      Scene.expect(Scene.selector('div h1')).toHaveText('Title'),
      Scene.expect(Scene.selector('div p')).toHaveText('A paragraph.'),
      Scene.expect(Scene.selector('div hr')).toExist(),
      Scene.tap(({ html }) => {
        expect(Scene.textContent(html)).toBe('TitleA paragraph.')
      }),
    )
  })

  it('renders every heading level to its matching element', () => {
    const document = parseMarkdown(
      lines(
        '# one',
        '## two',
        '### three',
        '#### four',
        '##### five',
        '###### six',
      ),
    )

    expectRendered(
      view(document),
      Scene.expect(Scene.selector('h1')).toHaveText('one'),
      Scene.expect(Scene.selector('h2')).toHaveText('two'),
      Scene.expect(Scene.selector('h3')).toHaveText('three'),
      Scene.expect(Scene.selector('h4')).toHaveText('four'),
      Scene.expect(Scene.selector('h5')).toHaveText('five'),
      Scene.expect(Scene.selector('h6')).toHaveText('six'),
      Scene.tap(({ html }) => {
        expect(Scene.textContent(html)).toBe('onetwothreefourfivesix')
      }),
    )
  })

  it('passes each code block its occurrence index in document order', () => {
    const document = parseMarkdown(
      lines(
        '```ts',
        'const first = 1',
        '```',
        '',
        '```ts',
        'const second = 2',
        '```',
      ),
    )
    const receivedIndexes: Array<number> = []

    view(document, {
      views: {
        CodeBlock: (_codeBlock, occurrenceIndex) => {
          receivedIndexes.push(occurrenceIndex)
          return ih.pre([])
        },
      },
    })

    expect(receivedIndexes).toStrictEqual([0, 1])
  })

  it('renders nested inline content through the default views', () => {
    const document = parseMarkdown(
      'Some *emphasis*, `code`, and a [link](https://example.com).',
    )

    expectRendered(
      view(document),
      Scene.expect(Scene.selector('p')).toHaveText(
        'Some emphasis, code, and a link.',
      ),
      Scene.expect(Scene.selector('p em')).toHaveText('emphasis'),
      Scene.expect(Scene.selector('p code')).toHaveText('code'),
      Scene.expect(Scene.selector('p a')).toHaveText('link'),
      Scene.expect(Scene.selector('p a')).toHaveAttr(
        'href',
        'https://example.com',
      ),
    )
  })

  it('renders unordered and ordered lists', () => {
    const unordered = parseMarkdown(lines('- one', '- two'))
    const ordered = parseMarkdown(lines('3. three', '4. four'))

    expectRendered(
      view(unordered),
      Scene.expect(Scene.selector('div ul li')).toHaveText('one'),
    )
    expectRendered(
      view(ordered),
      Scene.expect(Scene.selector('div ol')).toHaveAttr('start', '3'),
      Scene.expect(Scene.selector('div ol li')).toHaveText('three'),
    )
  })

  it('renders table header and body cells with alignment styles', () => {
    const document = parseMarkdown(
      lines('| Stock | Speed |', '| :--- | ---: |', '| Portra | 400 |'),
    )

    expectRendered(
      view(document),
      Scene.expect(Scene.selector('table th')).toHaveText('Stock'),
      Scene.expect(Scene.selector('table th')).toHaveStyle(
        'text-align',
        'left',
      ),
      Scene.expect(Scene.nth(Scene.all.selector('table td'), 1)).toHaveText(
        '400',
      ),
      Scene.expect(Scene.nth(Scene.all.selector('table td'), 1)).toHaveStyle(
        'text-align',
        'right',
      ),
    )
  })

  it('renders islands through the registered view with attributes and nested content', () => {
    const document = parseMarkdown(
      lines(':::Note{tone="calm"}', 'Inside the island.', ':::'),
    )

    expectRendered(
      view(document, {
        islands: {
          Note: (attributes, content) =>
            ih.aside(
              [ih.Class(`note-${attributes['tone'] ?? 'plain'}`)],
              content,
            ),
        },
      }),
      Scene.expect(Scene.selector('div aside')).toHaveClass('note-calm'),
      Scene.expect(Scene.selector('div aside p')).toHaveText(
        'Inside the island.',
      ),
    )
  })

  it('passes each island its per-name occurrence index in document order', () => {
    const document = parseMarkdown(
      lines('::Slot', '', 'Between.', '', '::Slot'),
    )

    const receivedIndexes: Array<number> = []
    view(document, {
      islands: {
        Slot: (_attributes, _content, occurrenceIndex) => {
          receivedIndexes.push(occurrenceIndex)
          return ih.div([])
        },
      },
    })

    expect(receivedIndexes).toStrictEqual([0, 1])
  })

  it('ignores inherited object members when resolving island views', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const document = parseMarkdown('::constructor')

    expectRendered(
      view(document, { islands: {} }),
      Scene.expect(Scene.selector('div')).toBeEmpty(),
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('No island view registered for "constructor"'),
    )
  })

  it('warns once and renders nothing for an unregistered island', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const document = parseMarkdown(lines('::Missing', '', '::Missing'))

    const rendered = view(document)
    view(document)

    expectRendered(rendered, Scene.expect(Scene.selector('div')).toBeEmpty())
    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('No island view registered for "Missing"'),
    )
  })

  it('applies view overrides over the defaults', () => {
    const document = parseMarkdown('A paragraph.')

    expectRendered(
      view(document, {
        views: {
          Paragraph: (_paragraph, content) =>
            ih.p([ih.Class('leading-relaxed')], content),
        },
      }),
      Scene.expect(Scene.selector('div p')).toHaveClass('leading-relaxed'),
    )
  })

  it('islandsFor decodes attributes through the island schema before dispatch', () => {
    const document = parseMarkdown('::Badge{label="hi"}')

    expectRendered(
      view(document, {
        islands: islandsFor(
          {
            Badge: Schema.Struct({ label: Schema.optionalKey(Schema.String) }),
          },
          {
            Badge: ({ label }, _content, occurrenceIndex) =>
              ih.span([], [label ?? 'none', String(occurrenceIndex)]),
          },
        ),
      }),
      Scene.expect(Scene.selector('div span')).toHaveText('hi0'),
    )
  })

  it('islandsFor warns and renders nothing when attributes fail the schema', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const document = parseMarkdown('::Gauge')

    expectRendered(
      view(document, {
        islands: islandsFor(
          { Gauge: Schema.Struct({ level: Schema.String }) },
          { Gauge: ({ level }) => ih.span([], [level]) },
        ),
      }),
      Scene.expect(Scene.selector('div')).toBeEmpty(),
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid attributes for island "Gauge"'),
    )
  })

  it('exposes the default views for reuse inside overrides', () => {
    const document = parseMarkdown('# Title')

    expectRendered(
      view(document, {
        views: {
          Heading: (heading, content) => defaultViews.Heading(heading, content),
        },
      }),
      Scene.expect(Scene.selector('div h1')).toHaveText('Title'),
    )
  })
})
