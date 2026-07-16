import { Array, Option, Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { parseMarkdown } from '../vite/vite.js'
import { defaultViews, islandsFor, view } from './view.js'

type TestVNode = Readonly<{
  sel?: string | undefined
  key?: string | undefined
  text?: string | undefined
  data?:
    | Readonly<{
        props?: Readonly<Record<string, unknown>> | undefined
        style?: Readonly<Record<string, unknown>> | undefined
      }>
    | undefined
  children?: ReadonlyArray<TestVNode | string> | undefined
}>

const asElement = (node: unknown): TestVNode => {
  if (node === null || node === undefined || typeof node === 'string') {
    throw new Error(`Expected an element vnode, got: ${String(node)}`)
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return node as TestVNode
}

const childAt = (node: TestVNode, index: number): TestVNode =>
  Option.match(Array.get(node.children ?? [], index), {
    onNone: () => {
      throw new Error(`Expected a child at index ${index} of <${node.sel}>`)
    },
    onSome: asElement,
  })

const textOf = (node: TestVNode): string =>
  (node.children ?? [])
    .map(child => {
      if (typeof child === 'string') {
        return child
      }
      if (child.text !== undefined) {
        return child.text
      }
      return textOf(child)
    })
    .join('')

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

    const root = asElement(view(document))

    expect(root.sel).toBe('div')
    expect(childAt(root, 0).sel).toBe('h1')
    expect(textOf(childAt(root, 0))).toBe('Title')
    expect(childAt(root, 1).sel).toBe('p')
    expect(textOf(childAt(root, 1))).toBe('A paragraph.')
    expect(childAt(root, 2).sel).toBe('hr')
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

    const root = asElement(view(document))

    expect(
      (root.children ?? []).map(child => asElement(child).sel),
    ).toStrictEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
  })

  it('renders nested inline content through the default views', () => {
    const document = parseMarkdown(
      'Some *emphasis*, `code`, and a [link](https://example.com).',
    )

    const paragraph = childAt(asElement(view(document)), 0)
    const [, emphasis, , inlineCode, , link] = paragraph.children ?? []

    expect(asElement(emphasis).sel).toBe('em')
    expect(asElement(inlineCode).sel).toBe('code')
    expect(asElement(link).sel).toBe('a')
    expect(asElement(link).data?.props).toMatchObject({
      href: 'https://example.com',
    })
  })

  it('renders unordered and ordered lists', () => {
    const unordered = parseMarkdown(lines('- one', '- two'))
    const ordered = parseMarkdown(lines('3. three', '4. four'))

    const unorderedList = childAt(asElement(view(unordered)), 0)
    const orderedList = childAt(asElement(view(ordered)), 0)

    expect(unorderedList.sel).toBe('ul')
    expect(orderedList.sel).toBe('ol')
    expect(orderedList.data?.props).toMatchObject({ start: 3 })
    expect(childAt(orderedList, 0).sel).toBe('li')
  })

  it('renders table header and body cells with alignment styles', () => {
    const document = parseMarkdown(
      lines('| Stock | Speed |', '| :--- | ---: |', '| Portra | 400 |'),
    )

    const table = childAt(asElement(view(document)), 0)
    const headerRow = childAt(childAt(table, 0), 0)
    const bodyRow = childAt(childAt(table, 1), 0)

    expect(table.sel).toBe('table')
    expect(childAt(headerRow, 0).sel).toBe('th')
    expect(childAt(headerRow, 0).data?.style).toMatchObject({
      'text-align': 'left',
    })
    expect(childAt(bodyRow, 1).sel).toBe('td')
    expect(childAt(bodyRow, 1).data?.style).toMatchObject({
      'text-align': 'right',
    })
  })

  it('renders islands through the registered view with attributes and nested content', () => {
    const h = html()
    const document = parseMarkdown(
      lines(':::Note{tone="calm"}', 'Inside the island.', ':::'),
    )

    const root = asElement(
      view(document, {
        islands: {
          Note: (attributes, content) =>
            h.aside(
              [h.Class(`note-${attributes['tone'] ?? 'plain'}`)],
              content,
            ),
        },
      }),
    )

    const island = childAt(root, 0)
    expect(island.sel).toBe('aside')
    expect(textOf(childAt(island, 0))).toBe('Inside the island.')
  })

  it('passes each island its per-name occurrence index in document order', () => {
    const h = html()
    const document = parseMarkdown(
      lines('::Slot', '', 'Between.', '', '::Slot'),
    )

    const receivedIndexes: Array<number> = []
    view(document, {
      islands: {
        Slot: (_attributes, _content, occurrenceIndex) => {
          receivedIndexes.push(occurrenceIndex)
          return h.div([], [])
        },
      },
    })

    expect(receivedIndexes).toStrictEqual([0, 1])
  })

  it('ignores inherited object members when resolving island views', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const document = parseMarkdown('::constructor')

    const root = asElement(view(document, { islands: {} }))

    expect(root.children ?? []).toHaveLength(0)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('No island view registered for "constructor"'),
    )
  })

  it('warns once and renders nothing for an unregistered island', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const document = parseMarkdown(lines('::Missing', '', '::Missing'))

    const root = asElement(view(document))
    view(document)

    expect(root.children ?? []).toHaveLength(0)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('No island view registered for "Missing"'),
    )
  })

  it('applies view overrides over the defaults', () => {
    const h = html()
    const document = parseMarkdown('A paragraph.')

    const root = asElement(
      view(document, {
        views: {
          Paragraph: (_paragraph, content) =>
            h.p([h.Class('leading-relaxed')], content),
        },
      }),
    )

    expect(childAt(root, 0).data).toMatchObject({
      class: { 'leading-relaxed': true },
    })
  })

  it('islandsFor decodes attributes through the island schema before dispatch', () => {
    const h = html()
    const document = parseMarkdown('::Badge{label="hi"}')

    const root = asElement(
      view(document, {
        islands: islandsFor(
          { Badge: S.Struct({ label: S.optionalKey(S.String) }) },
          {
            Badge: ({ label }, _content, occurrenceIndex) =>
              h.span([], [label ?? 'none', String(occurrenceIndex)]),
          },
        ),
      }),
    )

    expect(textOf(childAt(root, 0))).toBe('hi0')
  })

  it('islandsFor warns and renders nothing when attributes fail the schema', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const h = html()
    const document = parseMarkdown('::Gauge')

    const root = asElement(
      view(document, {
        islands: islandsFor(
          { Gauge: S.Struct({ level: S.String }) },
          { Gauge: ({ level }) => h.span([], [level]) },
        ),
      }),
    )

    expect(root.children ?? []).toHaveLength(0)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid attributes for island "Gauge"'),
    )
  })

  it('exposes the default views for reuse inside overrides', () => {
    const document = parseMarkdown('# Title')

    const root = asElement(
      view(document, {
        views: {
          Heading: (heading, content) => defaultViews.Heading(heading, content),
        },
      }),
    )

    expect(childAt(root, 0).sel).toBe('h1')
  })
})
