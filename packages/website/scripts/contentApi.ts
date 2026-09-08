import { Array, Option, Order, Record, String, pipe } from 'effect'

import { type ExampleMeta } from '../src/page/example/meta'
import { type BlogPostEntry } from './blogPosts'
import { SECTION_ORDER } from './markdown'
import { type PageMetadata } from './metadata'

// CONSTANTS

export const SITE_URL = 'https://foldkit.dev'

/** The only version of the content API that is currently served. */
export const API_VERSION = 'v1'

export const API_BASE_PATH = `/api/${API_VERSION}`

/** The advisory request ceiling reported by the `RateLimit` header fields. */
export const RATE_LIMIT_QUOTA = 600

export const RATE_LIMIT_WINDOW_SECONDS = 60

export const RATE_LIMIT_POLICY_NAME = 'default'

/** How long a deprecated version keeps answering after its `Deprecation` date. */
export const DEPRECATION_NOTICE_DAYS = 180

const API_DOCUMENTATION_URL = `${SITE_URL}/api`

const OPENAPI_URL = `${SITE_URL}/openapi.json`

/**
 * The `type` URI of a problem document, pointing at the heading on the API page
 * that documents that error.
 */
export const problemTypeUrl = (slug: string): string =>
  `${API_DOCUMENTATION_URL}#${slug}`

// PATHS

export const apiPagePath = (urlPath: string): string =>
  urlPath === '/'
    ? `${API_BASE_PATH}/pages/index.json`
    : `${API_BASE_PATH}/pages${urlPath}.json`

export const apiPageUrl = (urlPath: string): string => {
  const pagePath = urlPath === '/' ? 'index' : urlPath.slice(1)

  return `${SITE_URL}${API_BASE_PATH}/page.json?path=${encodeURIComponent(pagePath)}`
}

const markdownUrl = (urlPath: string): string =>
  urlPath === '/' ? `${SITE_URL}/index.md` : `${SITE_URL}${urlPath}.md`

// PAGES

export type ApiPageEntry = Readonly<{
  urlPath: string
  metadata: PageMetadata
  markdown: string
}>

type PageSummary = Readonly<{
  path: string
  url: string
  markdownUrl: string
  apiUrl: string
  title: string
  description: string
  section: string
}>

const toPageSummary = (entry: ApiPageEntry): PageSummary => ({
  path: entry.urlPath,
  url: `${SITE_URL}${entry.urlPath}`,
  markdownUrl: markdownUrl(entry.urlPath),
  apiUrl: apiPageUrl(entry.urlPath),
  title: entry.metadata.title,
  description: entry.metadata.description,
  section: entry.metadata.section,
})

export const buildPagesIndex = (
  entries: ReadonlyArray<ApiPageEntry>,
  generated: string,
): unknown => ({
  apiVersion: API_VERSION,
  generated,
  count: entries.length,
  pages: Array.map(entries, toPageSummary),
})

export const buildPageDocument = (
  entry: ApiPageEntry,
  generated: string,
): unknown => ({
  apiVersion: API_VERSION,
  generated,
  ...toPageSummary(entry),
  markdown: entry.markdown,
})

// SECTIONS

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

export const buildSectionsIndex = (
  entries: ReadonlyArray<ApiPageEntry>,
  generated: string,
): unknown => {
  const sections = pipe(
    entries,
    Array.filter(entry => String.isNonEmpty(entry.metadata.section)),
    Array.groupBy(entry => entry.metadata.section),
    Record.toEntries,
    Array.sortBy(Order.mapInput(sectionOrder, ([section]) => section)),
    Array.map(([section, sectionEntries]) => ({
      section,
      count: sectionEntries.length,
      pages: Array.map(sectionEntries, entry => toPageSummary(entry).path),
    })),
  )

  return {
    apiVersion: API_VERSION,
    generated,
    count: sections.length,
    sections,
  }
}

// EXAMPLES

const toExampleSummary = (example: ExampleMeta) => ({
  slug: example.slug,
  title: example.title,
  description: example.description,
  difficulty: example.difficulty,
  tags: example.tags,
  url: `${SITE_URL}/example-apps/${example.slug}`,
  markdownUrl: `${SITE_URL}/example-apps/${example.slug}.md`,
  playgroundUrl: `${SITE_URL}/playground/${example.slug}`,
  sourceUrl: `https://github.com/foldkit/foldkit/tree/main/examples/${example.slug}`,
})

export const buildExamplesIndex = (
  examples: ReadonlyArray<ExampleMeta>,
  generated: string,
): unknown => ({
  apiVersion: API_VERSION,
  generated,
  count: examples.length,
  examples: Array.map(examples, toExampleSummary),
})

// BLOG

const toBlogSummary = (entry: BlogPostEntry) => ({
  slug: entry.slug,
  title: entry.frontmatter.title,
  description: entry.frontmatter.description,
  date: entry.frontmatter.date,
  url: `${SITE_URL}/blog/${entry.slug}`,
  markdownUrl: `${SITE_URL}/blog/${entry.slug}.md`,
  coverUrl: pipe(
    entry.maybeCoverAsset,
    Option.map(cover => `${SITE_URL}${cover.src}`),
    Option.getOrUndefined,
  ),
})

export const buildBlogIndex = (
  posts: ReadonlyArray<BlogPostEntry>,
  generated: string,
): unknown => ({
  apiVersion: API_VERSION,
  generated,
  count: posts.length,
  feedUrl: `${SITE_URL}/blog/rss.xml`,
  posts: Array.map(posts, toBlogSummary),
})

// SERVICE INDEX

type EndpointCounts = Readonly<{
  pageCount: number
  exampleCount: number
  postCount: number
}>

const endpoint = (
  operationId: string,
  path: string,
  description: string,
): unknown => ({
  operationId,
  method: 'GET',
  path,
  url: `${SITE_URL}${path}`,
  description,
})

export const buildServiceIndex = (
  { pageCount, exampleCount, postCount }: EndpointCounts,
  generated: string,
): unknown => ({
  apiVersion: API_VERSION,
  generated,
  name: 'Foldkit Content API',
  description:
    'Read-only JSON access to the Foldkit documentation site: the page index, the Markdown of every page, the example applications, and the blog. Every endpoint is a public, unauthenticated GET.',
  documentation: API_DOCUMENTATION_URL,
  openapi: OPENAPI_URL,
  website: SITE_URL,
  authentication: {
    type: 'none',
    description:
      'No credentials, API key, or registration. Every endpoint is public and read-only.',
  },
  versioning: {
    current: API_VERSION,
    supported: [API_VERSION],
    style: 'url-path',
    responseHeader: 'API-Version',
    policy: `${API_DOCUMENTATION_URL}#versioning`,
    deprecation: {
      deprecationHeader: {
        name: 'Deprecation',
        specification: 'https://www.rfc-editor.org/rfc/rfc9745',
        format: 'structured-field-date',
        example: 'Deprecation: @1780272000',
        meaning:
          'When this version became deprecated, as seconds since the Unix epoch behind an @ sign.',
      },
      sunsetHeader: {
        name: 'Sunset',
        specification: 'https://www.rfc-editor.org/rfc/rfc8594',
        format: 'http-date',
        example: 'Sunset: Wed, 31 Dec 2025 23:59:59 GMT',
        meaning: 'When this version stops answering.',
      },
      linkRelation: 'deprecation',
      minimumNoticeDays: DEPRECATION_NOTICE_DAYS,
      description: `A breaking change ships as a new path prefix (/api/v2). The previous version then carries a Deprecation header holding the date it became deprecated, a Sunset header holding the date it stops answering, and a Link header with rel="deprecation" pointing at the migration notes. The two dates are at least ${DEPRECATION_NOTICE_DAYS} days apart. The two headers do not share a value format: read Deprecation as a structured-field date and Sunset as an HTTP-date. Compare Sunset against the current time to know how long is left.`,
    },
  },
  rateLimit: {
    policyName: RATE_LIMIT_POLICY_NAME,
    quota: RATE_LIMIT_QUOTA,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    headers: ['RateLimit', 'RateLimit-Policy'],
    description: `Every response advertises an advisory ceiling of ${RATE_LIMIT_QUOTA} requests per ${RATE_LIMIT_WINDOW_SECONDS} seconds per client. The site serves static files from a CDN and keeps no per-client counter, so both the remaining count and the seconds until reset are constants: they describe the policy, not this client's balance. Nothing in the site itself returns 429. The hosting platform may reject a request before it reaches this API and return a platform-owned 429 outside this contract; if that response carries Retry-After, obey it rather than the RateLimit fields.`,
  },
  errors: {
    mediaType: 'application/problem+json',
    specification: 'https://www.rfc-editor.org/rfc/rfc9457',
    documentation: `${API_DOCUMENTATION_URL}#errors`,
    codes: ['not_found', 'method_not_allowed'],
  },
  counts: {
    pages: pageCount,
    examples: exampleCount,
    blogPosts: postCount,
  },
  endpoints: [
    endpoint(
      'getServiceIndex',
      API_BASE_PATH,
      'This document: the endpoint list, the versioning and deprecation policy, the rate limit policy, and the error model.',
    ),
    endpoint(
      'listPages',
      `${API_BASE_PATH}/pages.json`,
      'Every documentation page with its title, description, section, and the URLs of its HTML, Markdown, and JSON representations.',
    ),
    endpoint(
      'getPage',
      `${API_BASE_PATH}/page.json`,
      'One documentation page with its metadata and its full Markdown content. Pass the page URL path without the leading slash as the `path` query parameter; the homepage is `index`. Each page in listPages carries the ready-made URL as apiUrl.',
    ),
    endpoint(
      'listSections',
      `${API_BASE_PATH}/sections.json`,
      'The documentation sections in reading order, each with the paths of the pages it holds.',
    ),
    endpoint(
      'listExamples',
      `${API_BASE_PATH}/examples.json`,
      'Every example application with its difficulty, tags, and the URLs of its write-up, playground, and source.',
    ),
    endpoint(
      'listBlogPosts',
      `${API_BASE_PATH}/blog.json`,
      'Every blog post with its publication date and the URLs of its HTML and Markdown representations.',
    ),
  ],
})

// PROBLEM DOCUMENTS

type Problem = Readonly<{
  slug: string
  title: string
  status: number
  code: string
  detail: string
  hints: ReadonlyArray<string>
}>

const DISCOVERY_LINKS = {
  api: `${SITE_URL}${API_BASE_PATH}`,
  documentation: API_DOCUMENTATION_URL,
  openapi: OPENAPI_URL,
  pages: `${SITE_URL}${API_BASE_PATH}/pages.json`,
  llms: `${SITE_URL}/llms.txt`,
  sitemap: `${SITE_URL}/sitemap.xml`,
}

export const buildProblemDocument = (problem: Problem): unknown => ({
  type: problemTypeUrl(problem.slug),
  title: problem.title,
  status: problem.status,
  detail: problem.detail,
  code: problem.code,
  hints: problem.hints,
  links: DISCOVERY_LINKS,
})

export const NOT_FOUND_PROBLEM: Problem = {
  slug: 'not-found',
  title: 'Not Found',
  status: 404,
  code: 'not_found',
  detail: 'Nothing exists at this path on foldkit.dev.',
  hints: [
    `Every endpoint is listed at ${SITE_URL}${API_BASE_PATH}, and every page at ${SITE_URL}${API_BASE_PATH}/pages.json.`,
    `Fetch one page from ${SITE_URL}${API_BASE_PATH}/page.json by passing its path in the \`path\` query parameter.`,
    `The endpoints are described in OpenAPI 3.1 at ${OPENAPI_URL}.`,
  ],
}

export const METHOD_NOT_ALLOWED_PROBLEM: Problem = {
  slug: 'method-not-allowed',
  title: 'Method Not Allowed',
  status: 405,
  code: 'method_not_allowed',
  detail: 'The content API is read-only. Only GET, HEAD, and OPTIONS work.',
  hints: [
    'Retry the same URL with GET.',
    `The endpoints are described in OpenAPI 3.1 at ${OPENAPI_URL}.`,
  ],
}

export const PROBLEMS: ReadonlyArray<Problem> = [
  NOT_FOUND_PROBLEM,
  METHOD_NOT_ALLOWED_PROBLEM,
]

export const problemPath = (problem: Problem): string =>
  `${API_BASE_PATH}/errors/${problem.slug}.json`

// DOCUMENT SET

/** The site-wide JSON error body, served for unknown paths in any format. */
export const SITE_NOT_FOUND_PATH = '/404.json'

export type ContentApiDocument = Readonly<{
  path: string
  document: unknown
}>

export type ContentApiInput = Readonly<{
  pages: ReadonlyArray<ApiPageEntry>
  examples: ReadonlyArray<ExampleMeta>
  posts: ReadonlyArray<BlogPostEntry>
  generated: string
}>

/**
 * Every JSON document the build writes into `dist`, as the path it is served
 * from and the value to serialize. The prerender script only writes what this
 * returns, so a document that stops being listed here stops being published,
 * and `contentApi.test.ts` fails.
 */
export const contentApiDocuments = ({
  pages,
  examples,
  posts,
  generated,
}: ContentApiInput): ReadonlyArray<ContentApiDocument> => {
  const collections: ReadonlyArray<ContentApiDocument> = [
    {
      path: `${API_BASE_PATH}/index.json`,
      document: buildServiceIndex(
        {
          pageCount: pages.length,
          exampleCount: examples.length,
          postCount: posts.length,
        },
        generated,
      ),
    },
    {
      path: `${API_BASE_PATH}/pages.json`,
      document: buildPagesIndex(pages, generated),
    },
    {
      path: `${API_BASE_PATH}/sections.json`,
      document: buildSectionsIndex(pages, generated),
    },
    {
      path: `${API_BASE_PATH}/examples.json`,
      document: buildExamplesIndex(examples, generated),
    },
    {
      path: `${API_BASE_PATH}/blog.json`,
      document: buildBlogIndex(posts, generated),
    },
  ]

  const pageDocuments = Array.map(pages, entry => ({
    path: apiPagePath(entry.urlPath),
    document: buildPageDocument(entry, generated),
  }))

  const problemDocuments = Array.map(PROBLEMS, problem => ({
    path: problemPath(problem),
    document: buildProblemDocument(problem),
  }))

  const siteNotFound: ContentApiDocument = {
    path: SITE_NOT_FOUND_PATH,
    document: buildProblemDocument(NOT_FOUND_PROBLEM),
  }

  return pipe(
    collections,
    Array.appendAll(pageDocuments),
    Array.appendAll(problemDocuments),
    Array.append(siteNotFound),
  )
}
