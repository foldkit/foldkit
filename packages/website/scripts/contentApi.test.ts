import { Array, Option, Record, pipe } from 'effect'
import { describe, expect, it } from 'vitest'

import { examples } from '../src/page/example/meta'
import { blogPosts } from './blogPosts'
import {
  API_BASE_PATH,
  type ApiPageEntry,
  PROBLEMS,
  SITE_NOT_FOUND_PATH,
  apiPagePath,
  apiPageUrl,
  buildBlogIndex,
  buildExamplesIndex,
  buildPageDocument,
  buildPagesIndex,
  buildProblemDocument,
  buildSectionsIndex,
  buildServiceIndex,
  contentApiDocuments,
  problemPath,
} from './contentApi'
import { openApiDocument } from './openApi'

// SCHEMA VALIDATION

/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
const schemas = openApiDocument.components.schemas as unknown as Record<
  string,
  JsonSchema
>

type JsonSchema = Readonly<{
  type?: string
  $ref?: string
  required?: ReadonlyArray<string>
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  enum?: ReadonlyArray<string>
  additionalProperties?: JsonSchema
}>

const resolveSchema = (schema: JsonSchema): JsonSchema =>
  Option.match(Option.fromNullishOr(schema.$ref), {
    onNone: () => schema,
    onSome: reference =>
      pipe(
        Record.get(schemas, reference.replace('#/components/schemas/', '')),
        Option.getOrThrowWith(
          () => new Error(`openapi.json has no schema for ${reference}`),
        ),
      ),
  })

const TYPE_PREDICATES: Record<string, (value: unknown) => boolean> = {
  object: value =>
    typeof value === 'object' && value !== null && !Array.isArray(value),
  array: value => Array.isArray(value),
  string: value => typeof value === 'string',
  integer: value => Number.isInteger(value),
  number: value => typeof value === 'number',
  boolean: value => typeof value === 'boolean',
}

const isTypeSatisfied = (type: string, value: unknown): boolean =>
  pipe(
    Record.get(TYPE_PREDICATES, type),
    Option.match({
      onNone: () => true,
      onSome: predicate => predicate(value),
    }),
  )

/**
 * Reports every way `value` fails `schema`, as a list of human-readable paths.
 * Enough of JSON Schema to hold the documents in this file to the shapes
 * openapi.json publishes: types, required members, enums, array items, and
 * nested objects behind a `$ref`.
 */
const schemaViolations = (
  schema: JsonSchema,
  value: unknown,
  path: string,
): ReadonlyArray<string> => {
  const resolved = resolveSchema(schema)

  if (resolved.type !== undefined && !isTypeSatisfied(resolved.type, value)) {
    return [`${path}: expected ${resolved.type}, received ${typeof value}`]
  }

  if (
    resolved.enum !== undefined &&
    typeof value === 'string' &&
    !resolved.enum.includes(value)
  ) {
    return [`${path}: ${value} is not one of ${resolved.enum.join(', ')}`]
  }

  if (resolved.type === 'array' && Array.isArray(value)) {
    return Option.match(Option.fromNullishOr(resolved.items), {
      onNone: () => [],
      onSome: items =>
        Array.flatMap(value, (item, index) =>
          schemaViolations(items, item, `${path}[${index}]`),
        ),
    })
  }

  if (
    resolved.type !== 'object' ||
    typeof value !== 'object' ||
    value === null
  ) {
    return []
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const record = value as Record<string, unknown>

  const missing = pipe(
    resolved.required ?? [],
    Array.filter(member => Option.isNone(Record.get(record, member))),
    Array.map(member => `${path}: missing required member ${member}`),
  )

  const nested = pipe(
    Record.toEntries(resolved.properties ?? {}),
    Array.flatMap(([member, memberSchema]) =>
      Option.match(Record.get(record, member), {
        onNone: () => [],
        onSome: memberValue =>
          schemaViolations(memberSchema, memberValue, `${path}.${member}`),
      }),
    ),
  )

  return Array.appendAll(missing, nested)
}

const expectMatchesSchema = (schemaName: string, document: unknown) => {
  expect(
    schemaViolations(
      { $ref: `#/components/schemas/${schemaName}` },
      JSON.parse(JSON.stringify(document)),
      schemaName,
    ),
  ).toEqual([])
}

// FIXTURES

const GENERATED = '2026-08-22'

const homePage: ApiPageEntry = {
  urlPath: '/',
  metadata: { title: 'Foldkit', description: 'The homepage.', section: '' },
  markdown: '# Foldkit',
}

const modelPage: ApiPageEntry = {
  urlPath: '/core/model',
  metadata: {
    title: 'Model',
    description: 'One Schema-defined Model.',
    section: 'Core Concepts',
  },
  markdown: '# Model\n\nThe Model holds state.',
}

const getStartedPage: ApiPageEntry = {
  urlPath: '/get-started',
  metadata: {
    title: 'Get Started',
    description: 'Create a project.',
    section: 'Docs',
  },
  markdown: '# Get Started',
}

const pageEntries: ReadonlyArray<ApiPageEntry> = [
  homePage,
  modelPage,
  getStartedPage,
]

// TESTS

describe('page documents', () => {
  it('serve one JSON document per page, keyed by the page path', () => {
    expect(apiPagePath('/')).toBe(`${API_BASE_PATH}/pages/index.json`)
    expect(apiPagePath('/core/model')).toBe(
      `${API_BASE_PATH}/pages/core/model.json`,
    )
  })

  it('address pages through a query parameter that can carry nested paths', () => {
    expect(apiPageUrl('/')).toBe(
      'https://foldkit.dev/api/v1/page.json?path=index',
    )
    expect(apiPageUrl('/core/model')).toBe(
      'https://foldkit.dev/api/v1/page.json?path=core%2Fmodel',
    )
  })

  it('report the page metadata and every representation of it', () => {
    const document = buildPageDocument(modelPage, GENERATED)

    expect(document).toMatchObject({
      apiVersion: 'v1',
      generated: GENERATED,
      path: '/core/model',
      url: 'https://foldkit.dev/core/model',
      markdownUrl: 'https://foldkit.dev/core/model.md',
      apiUrl: 'https://foldkit.dev/api/v1/page.json?path=core%2Fmodel',
      title: 'Model',
      section: 'Core Concepts',
      markdown: '# Model\n\nThe Model holds state.',
    })
    expectMatchesSchema('PageDocument', document)
  })

  it('point the homepage at index.md and its own JSON document', () => {
    const document = buildPageDocument(homePage, GENERATED)

    expect(document).toMatchObject({
      path: '/',
      url: 'https://foldkit.dev/',
      markdownUrl: 'https://foldkit.dev/index.md',
      apiUrl: 'https://foldkit.dev/api/v1/page.json?path=index',
    })
  })
})

describe('collection documents', () => {
  it('list every page against the published schema', () => {
    const document = buildPagesIndex(pageEntries, GENERATED)

    expect(document).toMatchObject({ count: pageEntries.length })
    expectMatchesSchema('PagesIndex', document)
  })

  it('group pages into sections in reading order, dropping unsectioned pages', () => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const document = buildSectionsIndex(pageEntries, GENERATED) as {
      sections: ReadonlyArray<{ section: string; pages: ReadonlyArray<string> }>
    }

    expect(Array.map(document.sections, ({ section }) => section)).toEqual([
      'Docs',
      'Core Concepts',
    ])
    expect(
      pipe(
        Array.last(document.sections),
        Option.map(({ pages }) => pages),
        Option.getOrNull,
      ),
    ).toEqual(['/core/model'])
    expectMatchesSchema('SectionsIndex', document)
  })

  it('list every example against the published schema', () => {
    const document = buildExamplesIndex(examples, GENERATED)

    expect(document).toMatchObject({ count: examples.length })
    expectMatchesSchema('ExamplesIndex', document)
  })

  it('list every blog post against the published schema', () => {
    const document = buildBlogIndex(blogPosts, GENERATED)

    expect(document).toMatchObject({
      count: blogPosts.length,
      feedUrl: 'https://foldkit.dev/blog/rss.xml',
    })
    expectMatchesSchema('BlogIndex', document)
  })

  it('describe the service against the published schema', () => {
    const document = buildServiceIndex(
      { pageCount: 3, exampleCount: 2, postCount: 1 },
      GENERATED,
    )

    expectMatchesSchema('ServiceIndex', document)
  })
})

describe('problem documents', () => {
  it('match the published ProblemDetails schema', () => {
    for (const problem of PROBLEMS) {
      expectMatchesSchema('ProblemDetails', buildProblemDocument(problem))
    }
  })

  it('are published under the versioned error catalog', () => {
    expect(Array.map(PROBLEMS, problemPath)).toEqual([
      `${API_BASE_PATH}/errors/not-found.json`,
      `${API_BASE_PATH}/errors/method-not-allowed.json`,
    ])
  })
})

describe('the published document set', () => {
  const documents = contentApiDocuments({
    pages: pageEntries,
    examples,
    posts: blogPosts,
    generated: GENERATED,
  })

  const paths = Array.map(documents, document => document.path)

  it('publishes the service index, the collections, and the error bodies', () => {
    for (const expected of [
      `${API_BASE_PATH}/index.json`,
      `${API_BASE_PATH}/pages.json`,
      `${API_BASE_PATH}/sections.json`,
      `${API_BASE_PATH}/examples.json`,
      `${API_BASE_PATH}/blog.json`,
      `${API_BASE_PATH}/errors/not-found.json`,
      `${API_BASE_PATH}/errors/method-not-allowed.json`,
      SITE_NOT_FOUND_PATH,
    ]) {
      expect(paths).toContain(expected)
    }
  })

  it('publishes one document per page', () => {
    for (const entry of pageEntries) {
      expect(paths).toContain(apiPagePath(entry.urlPath))
    }
  })

  it('writes every document to a distinct path under the site root', () => {
    expect(new Set(paths).size).toBe(paths.length)

    for (const path of paths) {
      expect(path.startsWith('/'), path).toBe(true)
      expect(path.endsWith('.json'), path).toBe(true)
      expect(path.includes('..'), path).toBe(false)
    }
  })

  it('holds nothing but the collections, the pages, and the error bodies', () => {
    const COLLECTION_COUNT = 5

    expect(documents.length).toBe(
      COLLECTION_COUNT + pageEntries.length + PROBLEMS.length + 1,
    )
  })
})
