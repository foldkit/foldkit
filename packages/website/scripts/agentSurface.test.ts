import { Array, Option, Record, String, pipe } from 'effect'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { slugify } from '../src/markdown/slug'
import {
  API_BASE_PATH,
  NOT_FOUND_PROBLEM,
  PROBLEMS,
  buildProblemDocument,
  buildServiceIndex,
} from './contentApi'
import { serializeOpenApiDocument } from './openApi'

const WEBSITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const readWebsiteFile = (relativePath: string): string =>
  readFileSync(resolve(WEBSITE_DIR, relativePath), 'utf8')

const readPublicFile = (relativePath: string): string =>
  readWebsiteFile(`public/${relativePath}`)

type OpenApiOperation = Readonly<{
  operationId?: string
  summary?: string
  description?: string
  responses?: Record<
    string,
    { $ref?: string; content?: Record<string, unknown> }
  >
}>

const spec = JSON.parse(readPublicFile('openapi.json'))

const operations: ReadonlyArray<readonly [string, OpenApiOperation]> = pipe(
  Record.toEntries(spec.paths as Record<string, Record<string, unknown>>),
  Array.flatMap(([path, methods]) =>
    pipe(
      Record.toEntries(methods),
      Array.map(
        ([method, operation]) =>
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          [
            `${method.toUpperCase()} ${path}`,
            operation as OpenApiOperation,
          ] as const,
      ),
    ),
  ),
)

type ProblemDocument = Readonly<{
  type: string
  title: string
  status: number
  detail: string
  code: string
  hints: ReadonlyArray<string>
  links: Readonly<Record<string, string>>
}>

const decodeProblem = (problem: (typeof PROBLEMS)[number]): ProblemDocument =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  JSON.parse(JSON.stringify(buildProblemDocument(problem))) as ProblemDocument

const responseEntries = (operation: OpenApiOperation) =>
  Record.toEntries(operation.responses ?? {})

const resolveRef = (ref: string): unknown =>
  Array.reduce(
    ref.replace('#/', '').split('/'),
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    spec as unknown,
    (node, segment) =>
      pipe(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        Record.get(node as Record<string, unknown>, segment),
        Option.getOrUndefined,
      ),
  )

describe('openapi.json', () => {
  it('matches the document scripts/openApi.ts generates', () => {
    expect(readPublicFile('openapi.json')).toBe(serializeOpenApiDocument())
  })

  it('declares OpenAPI 3.1 with the production and canary servers', () => {
    expect(spec.openapi).toBe('3.1.0')
    expect(spec.servers).toEqual([
      expect.objectContaining({ url: 'https://foldkit.dev' }),
      expect.objectContaining({ url: 'https://canary.foldkit.dev' }),
    ])
  })

  it('gives every operation a unique operationId, a summary, and a description', () => {
    expect(operations.length).toBeGreaterThan(0)

    for (const [label, operation] of operations) {
      expect(operation.operationId, label).toBeTruthy()
      expect(operation.summary, label).toBeTruthy()
      expect(operation.description, label).toBeTruthy()
    }

    const ids = Array.map(operations, ([, operation]) => operation.operationId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('types every success response against a schema the document defines', () => {
    for (const [label, operation] of operations) {
      const success = pipe(
        Record.get(operation.responses ?? {}, '200'),
        Option.getOrUndefined,
      )
      expect(success, label).toBeDefined()

      const contentEntries = Record.toEntries(success?.content ?? {})
      expect(contentEntries.length, label).toBe(1)

      for (const [mediaType, media] of contentEntries) {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const schema = (media as { schema?: { $ref?: string } }).schema
        expect(schema?.$ref, `${label} ${mediaType}`).toBeTruthy()
        expect(
          resolveRef(schema?.$ref ?? ''),
          `${label} ${mediaType}`,
        ).toBeDefined()
      }
    }
  })

  it('describes most operations with a JSON response schema', () => {
    const jsonOperations = Array.filter(operations, ([, operation]) =>
      pipe(
        pipe(
          Record.get(operation.responses ?? {}, '200'),
          Option.map(success => Record.keys(success.content ?? {})),
          Option.getOrElse((): ReadonlyArray<string> => []),
        ),
        Array.some(mediaType => String.includes('json')(mediaType)),
      ),
    )

    expect(jsonOperations.length / operations.length).toBeGreaterThan(0.6)
  })

  it('references one typed error model from every error response', () => {
    for (const [label, operation] of operations) {
      const errorResponses = Array.filter(
        responseEntries(operation),
        ([status]) => status.startsWith('4') || status.startsWith('5'),
      )
      expect(errorResponses.length, label).toBeGreaterThan(0)
      expect(
        Array.map(errorResponses, ([status]) => status),
        label,
      ).toContain('404')

      for (const [status, response] of errorResponses) {
        expect(response.$ref, `${label} ${status}`).toBeTruthy()

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const resolved = resolveRef(response.$ref ?? '') as {
          content: Record<string, { schema: { $ref: string } }>
        }
        expect(Record.keys(resolved.content), `${label} ${status}`).toContain(
          'application/problem+json',
        )
        expect(
          Record.get(resolved.content, 'application/problem+json').pipe(
            Option.map(media => media.schema.$ref),
            Option.getOrNull,
          ),
          `${label} ${status}`,
        ).toBe('#/components/schemas/ProblemDetails')
      }
    }
  })

  it('never declares a 405 on a GET, which cannot produce one', () => {
    for (const [label, operation] of operations) {
      expect(
        Array.map(responseEntries(operation), ([status]) => status),
        label,
      ).not.toContain('405')
    }
  })

  it('keeps hosting-platform throttling outside the API response contract', () => {
    for (const [label, operation] of operations) {
      expect(
        Array.map(responseEntries(operation), ([status]) => status),
        label,
      ).not.toContain('429')
    }
  })

  it('documents the two deprecation headers as separate value formats', () => {
    const { Deprecation, Sunset } = spec.components.headers

    expect(Deprecation.example).toMatch(/^@\d+$/)
    expect(Sunset.example).toMatch(/GMT$/)
    expect(Deprecation.description).toContain('9745')
    expect(Sunset.description).toContain('8594')
  })

  it('models errors as RFC 9457 problem documents with a stable code', () => {
    const problemDetails = spec.components.schemas.ProblemDetails

    expect(problemDetails.required).toEqual([
      'type',
      'title',
      'status',
      'detail',
      'code',
      'hints',
      'links',
    ])
    expect(problemDetails.properties.code.enum).toEqual(
      Array.map(PROBLEMS, problem => problem.code),
    )
  })

  it('covers the machine-readable surface the site actually serves', () => {
    const paths = Record.keys(spec.paths)
    for (const expected of [
      API_BASE_PATH,
      `${API_BASE_PATH}/pages.json`,
      `${API_BASE_PATH}/page.json`,
      `${API_BASE_PATH}/examples.json`,
      `${API_BASE_PATH}/blog.json`,
      '/llms.txt',
      '/llms-full.txt',
      '/page.md',
      '/sitemap.xml',
      '/blog/rss.xml',
      '/.well-known/mcp',
      '/openapi.json',
    ]) {
      expect(paths).toContain(expected)
    }
  })

  it('models nested page paths as query parameters', () => {
    for (const path of [`${API_BASE_PATH}/page.json`, '/page.md']) {
      expect(spec.paths[path].get.parameters, path).toEqual([
        expect.objectContaining({
          name: 'path',
          in: 'query',
          required: true,
        }),
      ])
    }
  })

  it('documents the version header only on versioned API errors', () => {
    expect(spec.components.responses.NotFound.headers).toHaveProperty(
      'API-Version',
    )
    expect(
      spec.components.responses.NotFoundNegotiated.headers,
    ).not.toHaveProperty('API-Version')
  })

  it('names the same operations the service index advertises', () => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const serviceIndex = buildServiceIndex(
      { pageCount: 1, exampleCount: 1, postCount: 1 },
      '2026-01-01',
    ) as {
      endpoints: ReadonlyArray<{ operationId: string; path: string }>
    }

    for (const { operationId, path } of serviceIndex.endpoints) {
      const maybeOperation = Array.findFirst(
        operations,
        ([label]) => label === `GET ${path}`,
      )

      expect(
        pipe(
          maybeOperation,
          Option.map(([, operation]) => operation.operationId),
          Option.getOrNull,
        ),
        path,
      ).toBe(operationId)
    }
  })
})

describe('problem documents', () => {
  it('carry the members the ProblemDetails schema requires', () => {
    for (const problem of PROBLEMS) {
      const document = decodeProblem(problem)

      for (const member of ['type', 'title', 'detail', 'code']) {
        expect(
          Option.getOrUndefined(
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            Record.get(document as unknown as Record<string, unknown>, member),
          ),
          `${problem.code} ${member}`,
        ).toBeTruthy()
      }
      expect(document.status, problem.code).toBe(problem.status)
      expect(document.hints.length, problem.code).toBeGreaterThan(0)
      expect(
        Option.getOrNull(Record.get(document.links, 'openapi')),
        problem.code,
      ).toBe('https://foldkit.dev/openapi.json')
    }
  })

  it('point their type URI at a heading the API page renders', () => {
    const headings = pipe(
      readWebsiteFile('src/page/contentApi.md').split('\n'),
      Array.filter(line => line.startsWith('### ')),
      Array.map(line => slugify(line.slice('### '.length))),
    )

    for (const problem of PROBLEMS) {
      const { type } = decodeProblem(problem)

      expect(type, problem.code).toBe(`https://foldkit.dev/api#${problem.slug}`)
      expect(headings, problem.code).toContain(problem.slug)
    }
  })
})

describe('404 bodies', () => {
  it('the JSON 404 is the not-found problem document', () => {
    const body = decodeProblem(NOT_FOUND_PROBLEM)

    expect(body.code).toBe('not_found')
    expect(body.status).toBe(404)
    expect(Option.getOrNull(Record.get(body.links, 'llms'))).toBe(
      'https://foldkit.dev/llms.txt',
    )
    expect(Option.getOrNull(Record.get(body.links, 'openapi'))).toBe(
      'https://foldkit.dev/openapi.json',
    )
    expect(Option.getOrNull(Record.get(body.links, 'api'))).toBe(
      `https://foldkit.dev${API_BASE_PATH}`,
    )
  })

  it('the markdown 404 points agents at the discovery endpoints', () => {
    const body = readPublicFile('404.md')

    expect(body).toContain('# 404 Not Found')
    expect(body).toContain('https://foldkit.dev/llms.txt')
    expect(body).toContain('https://foldkit.dev/sitemap.xml')
    expect(body).toContain('https://foldkit.dev/openapi.json')
    expect(body).toContain(`https://foldkit.dev${API_BASE_PATH}`)
    expect(body).toContain('`.md`')
  })
})

describe('.well-known/mcp', () => {
  it('names the published MCP server and its transport', () => {
    const manifest = JSON.parse(readPublicFile('.well-known/mcp'))

    const maybeServer = Array.head(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      manifest.servers as Array<{
        package: string
        transport: { type: string; command: string }
        registry: string
      }>,
    )
    expect(Option.isSome(maybeServer)).toBe(true)
    if (Option.isSome(maybeServer)) {
      expect(maybeServer.value.package).toBe('@foldkit/devtools-mcp')
      expect(maybeServer.value.transport.type).toBe('stdio')
      expect(maybeServer.value.transport.command).toBe('npx')
      expect(maybeServer.value.registry).toContain('npmjs.com')
    }
    expect(manifest.documentation).toBe('https://foldkit.dev/ai/mcp')
  })
})

describe('robots.txt', () => {
  it('keeps the agent digest pointers current', () => {
    const robots = readPublicFile('robots.txt')

    expect(robots).toContain('https://foldkit.dev/llms.txt')
    expect(robots).toContain('https://foldkit.dev/llms-full.txt')
    expect(robots).toContain('https://foldkit.dev/openapi.json')
    expect(robots).toContain(`https://foldkit.dev${API_BASE_PATH}`)
    expect(robots).toContain('Sitemap: https://foldkit.dev/sitemap.xml')
  })
})
