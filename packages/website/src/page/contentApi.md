# Foldkit Content API

## What This Is

The Foldkit Content API is a read-only JSON view of this documentation site. It answers the questions an agent asks before it can use Foldkit: which pages exist, what each one says, which example applications ship with the framework, and what has been published on the blog.

Every endpoint is a public, unauthenticated `GET`. There is no key, no registration, and no quota to apply for. Responses are static JSON documents served from a CDN, regenerated on every deploy.

The machine-readable description of everything below is [openapi.json](https://foldkit.dev/openapi.json), an OpenAPI 3.1 document with a typed schema for every response.

## Base URL

```text
https://foldkit.dev/api/v1
```

Fetching the base URL returns the service index: the endpoint list, the versioning policy, the rate limit policy, and the error model, in one document.

```sh
curl https://foldkit.dev/api/v1
```

## Endpoints

| Operation         | Path                            | Returns                                                                                                        |
| ----------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `getServiceIndex` | `/api/v1`                       | The endpoint list and the policies on this page.                                                               |
| `listPages`       | `/api/v1/pages.json`            | Every documentation page with title, description, section, and the URLs of its HTML, Markdown, and JSON forms. |
| `getPage`         | `/api/v1/page.json?path={path}` | One page with its metadata and its full Markdown content.                                                      |
| `listSections`    | `/api/v1/sections.json`         | The documentation sections in reading order, each with the paths of the pages it holds.                        |
| `listExamples`    | `/api/v1/examples.json`         | Every example application with difficulty, tags, and the URLs of its write-up, playground, and source.         |
| `listBlogPosts`   | `/api/v1/blog.json`             | Every blog post with its publication date and the URLs of its HTML and Markdown forms.                         |

The `path` query parameter of `getPage` is the page's URL path without the leading slash. Query encoding handles nested paths such as `core/model`, so ordinary OpenAPI clients can call the endpoint without special path handling. The homepage is `index`. Every entry from `listPages` also carries a ready-made `apiUrl`.

```sh
curl 'https://foldkit.dev/api/v1/page.json?path=core%2Fmodel'
```

Reading the whole documentation set is one request, not one per page: [llms-full.txt](https://foldkit.dev/llms-full.txt) concatenates every page into a single Markdown file.

## Authentication

None. Every endpoint is public and read-only, so there is nothing to send and nothing to keep secret.

Responses carry `Access-Control-Allow-Origin: *`, and `Access-Control-Expose-Headers` names every header below (`API-Version`, `RateLimit`, `RateLimit-Policy`, `Allow`, `Link`, `Deprecation`, `Sunset`). Without that second header a browser hands your script the body and hides the metadata, so a browser-based agent can read all of it. The same applies to [openapi.json](https://foldkit.dev/openapi.json), [llms.txt](https://foldkit.dev/llms.txt), the sitemap, the feed, and every `.md` page.

Under `/api`, only `GET`, `HEAD`, and `OPTIONS` are accepted. Any other method answers `405` with an `Allow` header.

## Versioning

The version is the first path segment after `/api`. Today that is `v1`, and every response from that prefix carries an `API-Version: v1` header. A response for an unknown prefix such as `/api/v2` carries no API version because no version served it.

Within a version, the API only grows. New endpoints and new fields on existing responses can appear at any time, so parse responses in a way that ignores fields you do not recognize. What will not happen inside `v1` is a field being removed, renamed, or changed in meaning.

A change that would break those guarantees ships as a new prefix, `/api/v2`, alongside the old one. When `v1` is scheduled for removal, its responses start carrying three headers:

```text
Deprecation: @1780272000
Sunset: Wed, 31 Dec 2025 23:59:59 GMT
Link: </api/v2>; rel="deprecation"
```

The two dates do not share a value format, which is the detail that trips up a shared date parser. `Deprecation` (RFC 9745) is a structured-field date, seconds since the Unix epoch behind an `@`, and it holds the moment the version _became_ deprecated, not the moment anyone announced it. `Sunset` (RFC 8594) is an HTTP-date, and it holds the moment the version stops answering.

Those two dates are at least 180 days apart. What matters to a running client is not that number, though: the time it has left is `Sunset` minus now. An agent that first sees these headers a week before the sunset date has a week. A version with no removal scheduled carries neither header.

The documents outside `/api` keep the well-known paths their conventions define, so [llms.txt](https://foldkit.dev/llms.txt), [openapi.json](https://foldkit.dev/openapi.json), [sitemap.xml](https://foldkit.dev/sitemap.xml), and [/.well-known/mcp](https://foldkit.dev/.well-known/mcp) are unversioned by design.

## Rate Limits

Every response advertises an advisory ceiling of 600 requests per 60 seconds per client, using the [RateLimit header fields](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/):

```text
RateLimit-Policy: "default";q=600;w=60
RateLimit: "default";r=600;t=60
```

`q` is the quota, `w` is the window in seconds, `r` is the remaining requests, and `t` is the seconds until the window resets.

Both `r` and `t` are constants here. This site is a set of static files behind a CDN and keeps no per-client counter, so it cannot tell you your balance or when your window turns over; the four numbers describe the policy to pace against and nothing more. Read `RateLimit-Policy` and ignore `r` and `t` as live values.

The site itself never returns `429`. The hosting platform can reject a request before it reaches this API, but that response belongs to the platform and sits outside the OpenAPI contract. If it carries a `Retry-After` header, obey it. Fetching `llms-full.txt` once beats fetching a hundred pages separately.

## Errors

Every error generated by the Content API is an [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem document, served as `application/problem+json`, whatever the request asked for. Outside `/api` the same failure is negotiated: ask for JSON and you get this document, ask for HTML and you get the error page, ask for nothing in particular and you get a Markdown pointer to the discovery endpoints. A hosting-platform rejection can happen before the request reaches the API and is not one of these responses.

```json
{
  "type": "https://foldkit.dev/api#not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Nothing exists at this path on foldkit.dev.",
  "code": "not_found",
  "hints": ["..."],
  "links": {
    "api": "https://foldkit.dev/api/v1",
    "openapi": "https://foldkit.dev/openapi.json"
  }
}
```

`type` is a URI that names the error and links to its description on this page. `title` and `status` restate the HTTP status. `detail` says what went wrong in one sentence. `code` is the stable string to branch on. `hints` say what to do next, and `links` carry the discovery endpoints, so a failed request still tells an agent where to look.

### Not Found

`404` with code `not_found`. The path does not exist. Check [pages.json](https://foldkit.dev/api/v1/pages.json) for the page paths and use the `apiUrl` each entry provides.

### Method Not Allowed

`405` with code `method_not_allowed`. The API is read-only. Retry with `GET`; the `Allow` header lists the methods that work.

The two documents above are also served as files, at `/api/v1/errors/not-found.json` and `/api/v1/errors/method-not-allowed.json`, so you can read the catalog before you hit either one. Those fetches answer `200`, since fetching the catalog is not itself an error.

## The Rest of the Machine-Readable Surface

The Content API is one of several ways to read this site as data:

- [llms.txt](https://foldkit.dev/llms.txt) indexes every page with a one-line description, in the llms.txt format.
- [llms-full.txt](https://foldkit.dev/llms-full.txt) is every page's Markdown in one file.
- `/page.md?path={path}` fetches one page as Markdown through an OpenAPI-friendly query parameter. Any page URL with `.md` appended returns the same document, as does the page URL requested with `Accept: text/markdown`.
- [sitemap.xml](https://foldkit.dev/sitemap.xml) lists every page URL, and [blog/rss.xml](https://foldkit.dev/blog/rss.xml) carries the blog.
- [/.well-known/mcp](https://foldkit.dev/.well-known/mcp) describes the [DevTools MCP server](/ai/mcp), which connects an agent to a running Foldkit application rather than to this site.

The [AI overview](/ai/overview) explains how these fit together.
