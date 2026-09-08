import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  API_BASE_PATH,
  DEPRECATION_NOTICE_DAYS,
  PROBLEMS,
  RATE_LIMIT_QUOTA,
  RATE_LIMIT_WINDOW_SECONDS,
  SITE_URL,
} from './contentApi'

// DOCUMENT

type JsonValue =
  | string
  | number
  | boolean
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue }

type Reference = Readonly<{ $ref: string }>

type PathItem = Readonly<Record<string, JsonValue>>

type JsonOperationConfig = Readonly<{
  operationId: string
  summary: string
  description: string
  schema: string
}>

type DocumentOperationConfig = Readonly<{
  operationId: string
  summary: string
  description: string
  mediaType: string
  schema: string
  parameters?: ReadonlyArray<JsonValue>
}>

const ref = (name: string): Reference => ({
  $ref: `#/components/schemas/${name}`,
})
const responseRef = (name: string): Reference => ({
  $ref: `#/components/responses/${name}`,
})
const headerRef = (name: string): Reference => ({
  $ref: `#/components/headers/${name}`,
})

const RATE_LIMIT_HEADERS = {
  RateLimit: headerRef('RateLimit'),
  'RateLimit-Policy': headerRef('RateLimitPolicy'),
}

const API_HEADERS = {
  ...RATE_LIMIT_HEADERS,
  'API-Version': headerRef('ApiVersion'),
}

const ERROR_RESPONSES = {
  404: responseRef('NotFound'),
}

// NOTE: the document endpoints negotiate their 404 on Accept, so they answer
// Markdown or HTML where the API always answers a problem document.
const DOCUMENT_ERROR_RESPONSES = {
  404: responseRef('NotFoundNegotiated'),
}

const jsonOperation = ({
  operationId,
  summary,
  description,
  schema,
}: JsonOperationConfig): PathItem => ({
  get: {
    operationId,
    summary,
    description,
    tags: ['Content API'],
    responses: {
      200: {
        description: summary,
        headers: API_HEADERS,
        content: { 'application/json': { schema: ref(schema) } },
      },
      ...ERROR_RESPONSES,
    },
  },
})

const documentOperation = ({
  operationId,
  summary,
  description,
  mediaType,
  schema,
  parameters,
}: DocumentOperationConfig): PathItem => ({
  get: {
    operationId,
    summary,
    description,
    tags: ['Documents'],
    ...(parameters === undefined ? {} : { parameters }),
    responses: {
      200: {
        description: summary,
        headers: RATE_LIMIT_HEADERS,
        content: { [mediaType]: { schema: ref(schema) } },
      },
      ...DOCUMENT_ERROR_RESPONSES,
    },
  },
})

const stringField = (description: string): JsonValue => ({
  type: 'string',
  description,
})

const urlField = (description: string): JsonValue => ({
  type: 'string',
  format: 'uri',
  description,
})

const ENVELOPE_PROPERTIES = {
  apiVersion: {
    type: 'string',
    description: 'The API version that produced this document.',
    examples: ['v1'],
  },
  generated: {
    type: 'string',
    format: 'date',
    description: 'The date the site was last built, as YYYY-MM-DD.',
  },
}

const PAGE_SUMMARY_PROPERTIES = {
  path: stringField(
    'The page URL path, with a leading slash. The homepage is `/`.',
  ),
  url: urlField('The page URL.'),
  markdownUrl: urlField('The URL of the page as Markdown.'),
  apiUrl: urlField('The URL of this page as a JSON document.'),
  title: stringField('The page title.'),
  description: stringField('One sentence describing the page.'),
  section: stringField(
    'The documentation section the page belongs to, empty for pages outside a section.',
  ),
}

const PAGE_SUMMARY_REQUIRED = [
  'path',
  'url',
  'markdownUrl',
  'apiUrl',
  'title',
  'description',
  'section',
]

/**
 * The OpenAPI 3.1 description served at /openapi.json. `public/openapi.json`
 * is written from this value; `scripts/agentSurface.test.ts` fails when the two
 * drift apart.
 */
export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Foldkit Content API',
    version: '1.1.0',
    summary:
      'Read-only JSON and document endpoints for the Foldkit documentation site.',
    description: [
      'Foldkit is a TypeScript frontend framework built on Effect. This document describes the machine-readable surface of foldkit.dev.',
      '',
      `The versioned JSON API lives under \`${API_BASE_PATH}\`: the page index, the Markdown of every page, the example applications, and the blog. Alongside it the site serves the documents their own conventions define at fixed paths: llms.txt, llms-full.txt, a Markdown variant of every page, the sitemap, the blog feed, and an MCP discovery manifest.`,
      '',
      'Every endpoint is a public, unauthenticated GET. There is no key and no registration. Responses carry `Access-Control-Allow-Origin: *` and name the metadata headers in `Access-Control-Expose-Headers`, so a browser agent can read both the body and the headers. Under `/api` only GET, HEAD, and OPTIONS are accepted; any other method answers 405 with an `Allow` header.',
      '',
      `Versioning: the version is the first path segment after \`/api\`, and every response from a supported version prefix carries an \`API-Version\` header. A response for an unknown prefix carries no version because no version served it. Inside a version the surface only grows, so ignore fields you do not recognize. A breaking change ships as a new prefix (\`/api/v2\`) and the previous version starts carrying \`Deprecation\` (RFC 9745, a structured-field date such as \`@1780272000\`, holding when that version became deprecated), \`Sunset\` (RFC 8594, an HTTP-date such as \`Wed, 31 Dec 2025 23:59:59 GMT\`, holding when it stops answering), and a \`Link\` header with \`rel="deprecation"\`. The two dates are at least ${DEPRECATION_NOTICE_DAYS} days apart. The headers do not share a value format, and what a client has left is \`Sunset\` minus the current time, not the notice period.`,
      '',
      `Rate limits: every response carries \`RateLimit\` and \`RateLimit-Policy\` advertising an advisory ceiling of ${RATE_LIMIT_QUOTA} requests per ${RATE_LIMIT_WINDOW_SECONDS} seconds. The site is static files behind a CDN and keeps no per-client counter, so both the remaining count and the seconds until reset are constants describing the policy rather than this client's balance. The site itself never returns 429. The hosting platform may reject a request before it reaches this API and return a platform-owned 429 outside this contract; if that response carries \`Retry-After\`, obey it.`,
      '',
      'Errors: every failure generated by the Content API is an RFC 9457 problem document served as `application/problem+json`, with a stable `code`, a human-readable `detail`, `hints` for what to do next, and `links` to the discovery endpoints. A hosting-platform rejection can happen before the request reaches the API and sits outside this contract. The document endpoints outside `/api` negotiate the same site-generated error on Accept, answering the problem document to a JSON client, HTML to a browser, and Markdown otherwise.',
      '',
      'The framework itself is consumed as npm packages (foldkit, @foldkit/ui) and scaffolded with `npm create foldkit-app@latest`, not through this HTTP API.',
    ].join('\n'),
    contact: {
      name: 'Foldkit',
      url: `${SITE_URL}/contact`,
    },
    license: {
      name: 'MIT',
      identifier: 'MIT',
    },
  },
  externalDocs: {
    description: 'Foldkit Content API documentation',
    url: `${SITE_URL}/api`,
  },
  servers: [
    {
      url: SITE_URL,
      description: 'Production documentation site',
    },
    {
      url: 'https://canary.foldkit.dev',
      description:
        'Canary deployment built from the main branch. Same surface as production, excluded from search indexing.',
    },
  ],
  tags: [
    {
      name: 'Content API',
      description: `The versioned JSON API under ${API_BASE_PATH}.`,
      externalDocs: { url: `${SITE_URL}/api` },
    },
    {
      name: 'Documents',
      description:
        'Machine-readable documents served at the fixed paths their own conventions define, outside the versioned API.',
      externalDocs: { url: `${SITE_URL}/ai/overview` },
    },
  ],
  paths: {
    [API_BASE_PATH]: jsonOperation({
      operationId: 'getServiceIndex',
      summary: 'The content API service index',
      description:
        'The endpoint list, the authentication model, the versioning and deprecation policy, the rate limit policy, the error model, and the number of pages, examples, and blog posts currently published. Fetch this first to discover the rest of the API.',
      schema: 'ServiceIndex',
    }),
    [`${API_BASE_PATH}/pages.json`]: jsonOperation({
      operationId: 'listPages',
      summary: 'Every documentation page',
      description:
        'Every documentation page with its title, description, section, and the URLs of its HTML, Markdown, and JSON representations. Use this to discover page paths, then fetch a page with getPage.',
      schema: 'PagesIndex',
    }),
    [`${API_BASE_PATH}/page.json`]: {
      get: {
        operationId: 'getPage',
        summary: 'One documentation page with its Markdown',
        description:
          'A single documentation page: the same metadata listPages reports, plus the full page content as Markdown. Pass the page URL path without the leading slash in the `path` query parameter, for example `core/model`. The homepage is `index`. To load every page at once, fetch /llms-full.txt instead.',
        tags: ['Content API'],
        parameters: [
          {
            name: 'path',
            in: 'query',
            required: true,
            description:
              'The page URL path without the leading slash, for example `core/model`. Every entry in listPages carries the ready-made absolute URL as apiUrl.',
            schema: {
              type: 'string',
              examples: ['index', 'get-started', 'core/model'],
            },
          },
        ],
        responses: {
          200: {
            description: 'One documentation page with its Markdown content.',
            headers: API_HEADERS,
            content: {
              'application/json': { schema: ref('PageDocument') },
            },
          },
          ...ERROR_RESPONSES,
        },
      },
    },
    [`${API_BASE_PATH}/sections.json`]: jsonOperation({
      operationId: 'listSections',
      summary: 'The documentation sections',
      description:
        'The documentation sections in reading order, each with the paths of the pages it holds. Use this to present the documentation the way the site groups it, then fetch pages with getPage.',
      schema: 'SectionsIndex',
    }),
    [`${API_BASE_PATH}/examples.json`]: jsonOperation({
      operationId: 'listExamples',
      summary: 'Every example application',
      description:
        'Every example application that ships with Foldkit, with its difficulty, tags, and the URLs of its write-up, its in-browser playground, and its source on GitHub.',
      schema: 'ExamplesIndex',
    }),
    [`${API_BASE_PATH}/blog.json`]: jsonOperation({
      operationId: 'listBlogPosts',
      summary: 'Every blog post',
      description:
        'Every blog post, newest first, with its publication date and the URLs of its HTML and Markdown representations.',
      schema: 'BlogIndex',
    }),
    '/llms.txt': documentOperation({
      operationId: 'getLlmsIndex',
      summary: 'Agent-oriented page index',
      description:
        'Lists every documentation page with a one-line description, grouped by section, in the llms.txt format. Includes guidance on when to use Foldkit and links to the other developer resources. Use this as the entry point for discovering pages, then fetch each page as Markdown or through getPage.',
      mediaType: 'text/plain',
      schema: 'MarkdownDocument',
    }),
    '/llms-full.txt': documentOperation({
      operationId: 'getLlmsFull',
      summary: 'Every documentation page in one file',
      description:
        'The Markdown content of every documentation page concatenated into a single file, each section preceded by its source URL. Suited to loading the full documentation into one context window, and cheaper than one request per page.',
      mediaType: 'text/plain',
      schema: 'MarkdownDocument',
    }),
    '/page.md': documentOperation({
      operationId: 'getPageMarkdown',
      summary: 'One documentation page as Markdown',
      description:
        'The Markdown variant of a single documentation page. Pass the page URL path without the leading slash in the `path` query parameter, for example `get-started` or `core/model`. Valid page paths are enumerated in /llms.txt, /api/v1/pages.json, and /sitemap.xml. The same document is available by appending `.md` to its HTML URL or by requesting the HTML URL with an Accept header containing text/markdown.',
      mediaType: 'text/markdown',
      schema: 'MarkdownDocument',
      parameters: [
        {
          name: 'path',
          in: 'query',
          required: true,
          description:
            'The page URL path without the leading slash, for example `core/model`. The homepage is `index`.',
          schema: {
            type: 'string',
            examples: ['index', 'get-started', 'core/model'],
          },
        },
      ],
    }),
    '/sitemap.xml': documentOperation({
      operationId: 'getSitemap',
      summary: 'Sitemap',
      description:
        'Every page URL on the site with its last modification date, in the sitemaps.org XML format.',
      mediaType: 'application/xml',
      schema: 'XmlDocument',
    }),
    '/blog/rss.xml': documentOperation({
      operationId: 'getBlogFeed',
      summary: 'Blog RSS feed',
      description:
        'The Foldkit blog as an RSS 2.0 feed, each item carrying the full post HTML in content:encoded.',
      mediaType: 'application/rss+xml',
      schema: 'XmlDocument',
    }),
    '/.well-known/mcp': documentOperation({
      operationId: 'getMcpManifest',
      summary: 'MCP server discovery manifest',
      description:
        'Describes the first-party Model Context Protocol server, @foldkit/devtools-mcp, which connects an agent to a running Foldkit application in development. The manifest names the package, its registry, its transport, and the setup command.',
      mediaType: 'application/json',
      schema: 'McpManifest',
    }),
    '/openapi.json': documentOperation({
      operationId: 'getOpenApiDescription',
      summary: 'This document',
      description:
        'The OpenAPI 3.1 description of every endpoint on this site, with a typed schema for each response.',
      mediaType: 'application/json',
      schema: 'OpenApiDocument',
    }),
  },
  components: {
    headers: {
      RateLimit: {
        description:
          'The advisory quota remaining in the current window, in the RateLimit header field format. The site keeps no per-client counter, so the remaining count always reports the full quota.',
        schema: { type: 'string' },
        example: `"default";r=${RATE_LIMIT_QUOTA};t=${RATE_LIMIT_WINDOW_SECONDS}`,
      },
      RateLimitPolicy: {
        description:
          'The advisory quota and window this response was served under, in the RateLimit header field format.',
        schema: { type: 'string' },
        example: `"default";q=${RATE_LIMIT_QUOTA};w=${RATE_LIMIT_WINDOW_SECONDS}`,
      },
      ApiVersion: {
        description: 'The content API version that served this response.',
        schema: { type: 'string' },
        example: 'v1',
      },
      Deprecation: {
        description:
          'Present only on a deprecated API version. An RFC 9745 structured-field date holding the moment that version became deprecated. Note that this is not the same value format as Sunset.',
        schema: { type: 'string' },
        example: '@1780272000',
      },
      Sunset: {
        description:
          'Present only on a deprecated API version. An RFC 8594 HTTP-date holding the moment that version stops answering. Compare it against the current time to know how long is left.',
        schema: { type: 'string' },
        example: 'Wed, 31 Dec 2025 23:59:59 GMT',
      },
    },
    responses: {
      NotFound: {
        description:
          'Nothing exists at the requested path. The body is an RFC 9457 problem document naming the error and linking the discovery endpoints.',
        headers: API_HEADERS,
        content: {
          'application/problem+json': { schema: ref('ProblemDetails') },
        },
      },
      NotFoundNegotiated: {
        description:
          'Nothing exists at the requested path. These endpoints negotiate the error body on Accept: a client asking for JSON receives the same RFC 9457 problem document the API returns, a browser receives the HTML error page, and anything else receives a Markdown pointer to the discovery endpoints.',
        headers: RATE_LIMIT_HEADERS,
        content: {
          'application/problem+json': { schema: ref('ProblemDetails') },
          'text/markdown': { schema: ref('MarkdownDocument') },
          'text/html': { schema: ref('HtmlDocument') },
        },
      },
    },
    schemas: {
      ProblemDetails: {
        type: 'object',
        title: 'Problem Details',
        description:
          'An RFC 9457 problem document. Every error generated by the site uses this shape, served as application/problem+json.',
        required: [
          'type',
          'title',
          'status',
          'detail',
          'code',
          'hints',
          'links',
        ],
        properties: {
          type: {
            type: 'string',
            format: 'uri',
            description:
              'A URI identifying the error type, pointing at the heading that documents it.',
            examples: [`${SITE_URL}/api#not-found`],
          },
          title: {
            type: 'string',
            description: 'A short, stable name for the error type.',
            examples: ['Not Found'],
          },
          status: {
            type: 'integer',
            description: 'The HTTP status code of the response.',
            examples: [404],
          },
          detail: {
            type: 'string',
            description: 'What went wrong, in one sentence.',
          },
          instance: {
            type: 'string',
            format: 'uri-reference',
            description:
              'The path the error occurred on, when the response names one.',
          },
          code: {
            type: 'string',
            description:
              'A stable machine-readable error code to branch on. Never changes within an API version.',
            enum: PROBLEMS.map(problem => problem.code),
          },
          hints: {
            type: 'array',
            description: 'What to do next, in order of usefulness.',
            items: { type: 'string' },
          },
          links: {
            type: 'object',
            description: 'Discovery endpoints, keyed by name.',
            additionalProperties: { type: 'string', format: 'uri' },
          },
        },
      },
      PageSummary: {
        type: 'object',
        title: 'Page Summary',
        description: 'One documentation page, without its content.',
        required: PAGE_SUMMARY_REQUIRED,
        properties: PAGE_SUMMARY_PROPERTIES,
      },
      PagesIndex: {
        type: 'object',
        title: 'Pages Index',
        description: 'Every documentation page the site publishes.',
        required: ['apiVersion', 'generated', 'count', 'pages'],
        properties: {
          ...ENVELOPE_PROPERTIES,
          count: {
            type: 'integer',
            description: 'How many pages the list holds.',
          },
          pages: {
            type: 'array',
            description: 'The pages, in the order they were rendered.',
            items: ref('PageSummary'),
          },
        },
      },
      PageDocument: {
        type: 'object',
        title: 'Page Document',
        description: 'One documentation page with its full Markdown content.',
        required: [
          'apiVersion',
          'generated',
          ...PAGE_SUMMARY_REQUIRED,
          'markdown',
        ],
        properties: {
          ...ENVELOPE_PROPERTIES,
          ...PAGE_SUMMARY_PROPERTIES,
          markdown: stringField('The full page content as Markdown.'),
        },
      },
      SectionsIndex: {
        type: 'object',
        title: 'Sections Index',
        description: 'The documentation sections, in reading order.',
        required: ['apiVersion', 'generated', 'count', 'sections'],
        properties: {
          ...ENVELOPE_PROPERTIES,
          count: {
            type: 'integer',
            description: 'How many sections the list holds.',
          },
          sections: {
            type: 'array',
            description: 'The sections, in reading order.',
            items: ref('SectionSummary'),
          },
        },
      },
      SectionSummary: {
        type: 'object',
        title: 'Section Summary',
        description: 'One documentation section and the pages it holds.',
        required: ['section', 'count', 'pages'],
        properties: {
          section: stringField('The section name.'),
          count: {
            type: 'integer',
            description: 'How many pages the section holds.',
          },
          pages: {
            type: 'array',
            description: 'The page paths in the section.',
            items: { type: 'string' },
          },
        },
      },
      ExampleSummary: {
        type: 'object',
        title: 'Example Summary',
        description: 'One example application that ships with Foldkit.',
        required: [
          'slug',
          'title',
          'description',
          'difficulty',
          'tags',
          'url',
          'markdownUrl',
          'playgroundUrl',
          'sourceUrl',
        ],
        properties: {
          slug: stringField('The example identifier used in its URLs.'),
          title: stringField('The example name.'),
          description: stringField('What the example demonstrates.'),
          difficulty: {
            type: 'string',
            description: 'How much Foldkit the example assumes.',
            enum: ['Beginner', 'Intermediate', 'Advanced'],
          },
          tags: {
            type: 'array',
            description: 'The concepts the example covers.',
            items: { type: 'string' },
          },
          url: urlField('The example write-up.'),
          markdownUrl: urlField('The example write-up as Markdown.'),
          playgroundUrl: urlField(
            'The example running in the in-browser playground.',
          ),
          sourceUrl: urlField('The example source on GitHub.'),
        },
      },
      ExamplesIndex: {
        type: 'object',
        title: 'Examples Index',
        description: 'Every example application that ships with Foldkit.',
        required: ['apiVersion', 'generated', 'count', 'examples'],
        properties: {
          ...ENVELOPE_PROPERTIES,
          count: {
            type: 'integer',
            description: 'How many examples the list holds.',
          },
          examples: {
            type: 'array',
            description: 'The examples, in documentation order.',
            items: ref('ExampleSummary'),
          },
        },
      },
      BlogPostSummary: {
        type: 'object',
        title: 'Blog Post Summary',
        description: 'One published blog post.',
        required: [
          'slug',
          'title',
          'description',
          'date',
          'url',
          'markdownUrl',
        ],
        properties: {
          slug: stringField('The post identifier used in its URL.'),
          title: stringField('The post title.'),
          description: stringField('One sentence describing the post.'),
          date: {
            type: 'string',
            format: 'date',
            description: 'The publication date, as YYYY-MM-DD.',
          },
          url: urlField('The post URL.'),
          markdownUrl: urlField('The post as Markdown.'),
          coverUrl: urlField('The post cover image, when it has one.'),
        },
      },
      BlogIndex: {
        type: 'object',
        title: 'Blog Index',
        description: 'Every published blog post, newest first.',
        required: ['apiVersion', 'generated', 'count', 'feedUrl', 'posts'],
        properties: {
          ...ENVELOPE_PROPERTIES,
          count: {
            type: 'integer',
            description: 'How many posts the list holds.',
          },
          feedUrl: urlField('The RSS feed carrying the same posts.'),
          posts: {
            type: 'array',
            description: 'The posts, newest first.',
            items: ref('BlogPostSummary'),
          },
        },
      },
      ServiceIndex: {
        type: 'object',
        title: 'Service Index',
        description:
          'What the content API offers and the policies it is served under.',
        required: [
          'apiVersion',
          'generated',
          'name',
          'description',
          'documentation',
          'openapi',
          'authentication',
          'versioning',
          'rateLimit',
          'errors',
          'endpoints',
        ],
        properties: {
          ...ENVELOPE_PROPERTIES,
          name: stringField('The API name.'),
          description: stringField('What the API offers.'),
          documentation: urlField('The human-readable API documentation.'),
          openapi: urlField('This OpenAPI document.'),
          website: urlField('The site the API describes.'),
          authentication: {
            type: 'object',
            description: 'What a client has to send. Nothing, in this case.',
            required: ['type', 'description'],
            properties: {
              type: {
                type: 'string',
                description: 'The authentication scheme.',
                enum: ['none'],
              },
              description: stringField('Why nothing is required.'),
            },
          },
          versioning: {
            type: 'object',
            description:
              'How the API is versioned and how a removal is announced.',
            required: ['current', 'supported', 'style', 'deprecation'],
            properties: {
              current: stringField('The version currently served.'),
              supported: {
                type: 'array',
                description: 'Every version still answering.',
                items: { type: 'string' },
              },
              style: {
                type: 'string',
                description: 'Where the version appears in a request.',
                enum: ['url-path'],
              },
              responseHeader: stringField(
                'The response header naming the version that served the response.',
              ),
              policy: urlField('The versioning policy in prose.'),
              deprecation: {
                type: 'object',
                description:
                  'The headers a deprecated version carries, each with its own value format, and how long the version keeps answering.',
                required: [
                  'deprecationHeader',
                  'sunsetHeader',
                  'minimumNoticeDays',
                ],
                properties: {
                  deprecationHeader: ref('DeprecationHeaderDescriptor'),
                  sunsetHeader: ref('DeprecationHeaderDescriptor'),
                  linkRelation: stringField(
                    'The Link relation pointing at the migration notes.',
                  ),
                  minimumNoticeDays: {
                    type: 'integer',
                    description:
                      'The minimum days between the deprecation date and the sunset date.',
                  },
                  description: stringField('The policy in one paragraph.'),
                },
              },
            },
          },
          rateLimit: {
            type: 'object',
            description: 'The advisory ceiling every response advertises.',
            required: ['quota', 'windowSeconds', 'headers'],
            properties: {
              policyName: stringField('The policy name used in the headers.'),
              quota: {
                type: 'integer',
                description: 'Requests allowed per window.',
              },
              windowSeconds: {
                type: 'integer',
                description: 'The window length in seconds.',
              },
              headers: {
                type: 'array',
                description: 'The headers carrying the policy.',
                items: { type: 'string' },
              },
              description: stringField('The policy in one paragraph.'),
            },
          },
          errors: {
            type: 'object',
            description: 'The error model every failure uses.',
            required: ['mediaType', 'specification', 'codes'],
            properties: {
              mediaType: stringField('The media type of an error body.'),
              specification: urlField('The specification the body follows.'),
              documentation: urlField('The error documentation in prose.'),
              codes: {
                type: 'array',
                description: 'Every error code the API can return.',
                items: { type: 'string' },
              },
            },
          },
          counts: {
            type: 'object',
            description: 'How much content the site currently publishes.',
            properties: {
              pages: { type: 'integer' },
              examples: { type: 'integer' },
              blogPosts: { type: 'integer' },
            },
          },
          endpoints: {
            type: 'array',
            description: 'Every endpoint the API serves.',
            items: ref('EndpointDescriptor'),
          },
        },
      },
      DeprecationHeaderDescriptor: {
        type: 'object',
        title: 'Deprecation Header Descriptor',
        description:
          'One header a deprecated version carries, named with the format its value takes. Deprecation and Sunset do not share a format, so each is described separately.',
        required: ['name', 'specification', 'format', 'example', 'meaning'],
        properties: {
          name: stringField('The header field name.'),
          specification: urlField('The RFC defining the header.'),
          format: {
            type: 'string',
            description: 'The value format the header takes.',
            enum: ['structured-field-date', 'http-date'],
          },
          example: stringField('A complete example header line.'),
          meaning: stringField('What the date says.'),
        },
      },
      EndpointDescriptor: {
        type: 'object',
        title: 'Endpoint Descriptor',
        description:
          'One endpoint, named by the same operationId this document uses.',
        required: ['operationId', 'method', 'path', 'url', 'description'],
        properties: {
          operationId: stringField(
            'The operation name, matching the operationId in openapi.json.',
          ),
          method: {
            type: 'string',
            description: 'The HTTP method.',
            enum: ['GET'],
          },
          path: stringField('The endpoint path, with a leading slash.'),
          url: urlField('The absolute endpoint URL.'),
          description: stringField('What the endpoint returns.'),
        },
      },
      McpManifest: {
        type: 'object',
        title: 'MCP Manifest',
        description:
          'The Model Context Protocol servers this project publishes.',
        required: ['name', 'description', 'website', 'servers'],
        properties: {
          name: stringField('The publishing project.'),
          description: stringField('What the servers are for.'),
          website: urlField('The project site.'),
          documentation: urlField('The server documentation.'),
          servers: {
            type: 'array',
            description: 'Every published server.',
            items: ref('McpServer'),
          },
        },
      },
      McpServer: {
        type: 'object',
        title: 'MCP Server',
        description: 'One Model Context Protocol server.',
        required: ['name', 'package', 'registry', 'description', 'transport'],
        properties: {
          name: stringField('The server name to configure it under.'),
          package: stringField('The package that ships the server.'),
          registry: urlField('Where the package is published.'),
          description: stringField('The tools the server exposes.'),
          transport: {
            type: 'object',
            description: 'How a client starts and talks to the server.',
            required: ['type'],
            properties: {
              type: {
                type: 'string',
                description: 'The MCP transport.',
                enum: ['stdio'],
              },
              command: stringField('The command that starts the server.'),
              args: {
                type: 'array',
                description: 'The arguments passed to the command.',
                items: { type: 'string' },
              },
            },
          },
          setup: stringField('How to wire the server into a project.'),
        },
      },
      MarkdownDocument: {
        type: 'string',
        title: 'Markdown Document',
        description: 'A Markdown document.',
      },
      HtmlDocument: {
        type: 'string',
        title: 'HTML Document',
        description: 'An HTML document.',
      },
      XmlDocument: {
        type: 'string',
        title: 'XML Document',
        description: 'An XML document.',
      },
      OpenApiDocument: {
        type: 'object',
        title: 'OpenAPI Document',
        description: 'An OpenAPI 3.1 description.',
        required: ['openapi', 'info', 'paths'],
        properties: {
          openapi: stringField('The OpenAPI specification version.'),
          info: { type: 'object', description: 'The API metadata.' },
          paths: { type: 'object', description: 'The described endpoints.' },
        },
      },
    },
  },
}

const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../public/openapi.json',
)

export const serializeOpenApiDocument = (): string =>
  `${JSON.stringify(openApiDocument, null, 2)}\n`

const entryPath = process.argv.at(1)
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(resolve(entryPath)).href
) {
  writeFileSync(OUTPUT_PATH, serializeOpenApiDocument())
  console.log(`Wrote ${OUTPUT_PATH}`)
}
