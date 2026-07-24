import { describe, expect, test } from 'vitest'

import { parseMarkdown } from '@foldkit/markdown/vite'

import commandsSource from '../page/core/commands.md?raw'
import manifestoSource from '../page/manifesto.md?raw'
import { islandAttributes } from './islandAttributes'
import { slugify } from './slug'
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

  test('commands table of contents matches the pre-migration ids', () => {
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
    ])
  })
})
