// NOTE: request-classification primitives shared by the dev host (the Vite
// plugin), the reference server, and the scaffold, so development predicts
// production. `acceptsHtml` parses the `Accept` header the way a browser
// negotiates content, and `resolvesToIndexHtml` normalizes a request path the
// way a static file server does, both of which are easy to get subtly wrong
// when duplicated per host.

const HTML_RANGE_SPECIFICITY: Readonly<Record<string, number>> = {
  'text/html': 3,
  'text/*': 2,
  '*/*': 1,
}

const qualityOf = (parameters: ReadonlyArray<string>): number => {
  for (const parameter of parameters) {
    const separator = parameter.indexOf('=')
    if (separator === -1) {
      continue
    }
    const name = parameter.slice(0, separator).trim().toLowerCase()
    if (name !== 'q') {
      continue
    }
    const value = Number(parameter.slice(separator + 1).trim())
    return Number.isNaN(value) ? 1 : value
  }
  return 1
}

// NOTE: split on a delimiter only where it is not inside a double-quoted string,
// so a quoted media-type parameter (`text/html;profile="a,b"`) is not torn apart
// at the comma or semicolon inside its value. A backslash inside a quoted string
// escapes the next character, so an escaped quote (`"a\",b"`) does not end the
// string and its delimiter stays quoted.
const splitOutsideQuotes = (
  value: string,
  delimiter: string,
): ReadonlyArray<string> => {
  const parts: Array<string> = []
  let current = ''
  let isInQuotes = false
  let isEscaped = false
  for (const character of value) {
    if (isEscaped) {
      current += character
      isEscaped = false
    } else if (isInQuotes && character === '\\') {
      current += character
      isEscaped = true
    } else if (character === '"') {
      isInQuotes = !isInQuotes
      current += character
    } else if (character === delimiter && !isInQuotes) {
      parts.push(current)
      current = ''
    } else {
      current += character
    }
  }
  parts.push(current)
  return parts
}

/**
 * Decides whether a client accepts an HTML response, given its `Accept`
 * header. An absent or empty header accepts anything. Otherwise the most
 * specific media range that covers `text/html` (`text/html`, then `text/*`,
 * then `*​/*`) decides, using its `q` value, so `text/html;q=0` is refused
 * even alongside `*​/*`.
 *
 * A page host renders the application for a request that accepts HTML and
 * serves a non-page response otherwise, so this is the negotiation a host runs
 * before falling through to a render.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const acceptsHtml = (acceptHeader: string | undefined): boolean => {
  if (acceptHeader === undefined || acceptHeader.trim() === '') {
    return true
  }

  let bestSpecificity = 0
  let bestQuality = 0
  for (const range of splitOutsideQuotes(acceptHeader, ',')) {
    const parts = splitOutsideQuotes(range, ';')
    const mediaType = parts[0]?.trim().toLowerCase() ?? ''
    const specificity = HTML_RANGE_SPECIFICITY[mediaType]
    if (specificity === undefined) {
      continue
    }
    if (specificity > bestSpecificity) {
      bestSpecificity = specificity
      bestQuality = qualityOf(parts.slice(1))
    }
  }

  return bestSpecificity > 0 && bestQuality > 0
}

/**
 * Merges a field name into an existing `Vary` header value, parsing it as a
 * comma-separated, case-insensitive list of field names. `Vary: *` already
 * varies on everything and is returned unchanged, a token already present (in
 * any case, and distinct from a longer name that merely starts with it, such as
 * `Accept-Language` beside `Accept`) is not duplicated, and otherwise the field
 * name is appended.
 *
 * A host whose response depends on a request header must declare that header in
 * `Vary` so a shared cache does not serve one client's representation to
 * another. The dev host, reference server, and scaffold merge through this one
 * helper rather than assigning `Vary`, which would drop the fields already
 * there.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const varyWith = (
  existing: string | undefined,
  fieldName: string,
): string => {
  const tokens =
    existing === undefined
      ? []
      : existing
          .split(',')
          .map(token => token.trim())
          .filter(token => token !== '')
  const lowered = tokens.map(token => token.toLowerCase())
  if (lowered.includes('*')) {
    return '*'
  }
  if (lowered.includes(fieldName.toLowerCase())) {
    return tokens.join(', ')
  }
  return [...tokens, fieldName].join(', ')
}

/**
 * Merges the `Accept` field name into an existing `Vary` header value.
 *
 * A page host that negotiates HTML on the `Accept` header must declare that in
 * `Vary` so a shared cache does not serve one representation in place of the
 * other.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const varyWithAccept = (existing: string | undefined): string =>
  varyWith(existing, 'Accept')

/**
 * Resolves a request target against the origin the host serves, returning the
 * absolute URL to hand the server entry, or `undefined` when the target names
 * a different origin.
 *
 * A request target is not a URL. HTTP allows origin-form (`/page?q=1`) and
 * absolute-form (`http://host/page`), and a client can send a network-path
 * reference (`//elsewhere.example/page`) that resolves against no scheme at
 * all. Resolving one of those against the host origin silently adopts the
 * origin the client wrote, so an entry that derives redirects, canonical URLs,
 * cookie domains, or tenant selection from `Request.url` would take them from
 * the request rather than from the deployment. Only a target that resolves to
 * the host's own origin is accepted; a host behind a proxy that must serve a
 * different public origin passes that origin in explicitly.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const resolveRequestUrl = (
  requestTarget: string,
  origin: string,
): string | undefined => {
  let base: URL
  try {
    base = new URL(origin)
  } catch {
    return undefined
  }
  let resolved: URL
  try {
    resolved = new URL(requestTarget, base)
  } catch {
    return undefined
  }
  // Credentials in the target are refused rather than passed along. `origin`
  // ignores them, so `http://user:pass@host/page` reads as same-origin here and
  // then makes `new Request(url)` throw, turning a malformed request into a 500
  // instead of the 400 it is.
  if (resolved.username !== '' || resolved.password !== '') {
    return undefined
  }
  return resolved.origin === base.origin ? resolved.href : undefined
}

const normalizePath = (path: string): string => {
  const segments: Array<string> = []
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') {
      continue
    }
    if (segment === '..') {
      segments.pop()
      continue
    }
    segments.push(segment)
  }
  return segments.join('/')
}

// The `Sec-Fetch-Dest` values a browser sends for a subresource it fetches for
// an already-loaded page, as opposed to a navigation (`document`, `iframe`,
// `frame`) or a scripted fetch whose destination is `empty`. A request carrying
// one of these is never a page request, whatever it says it accepts.
const SUBRESOURCE_FETCH_DESTINATIONS: ReadonlySet<string> = new Set([
  'audio',
  'audioworklet',
  'embed',
  'font',
  'image',
  'manifest',
  'object',
  'paintworklet',
  'script',
  'serviceworker',
  'sharedworker',
  'style',
  'track',
  'video',
  'worker',
  'xslt',
])

const ASSET_EXTENSIONS: ReadonlySet<string> = new Set([
  'avif',
  'bmp',
  'cjs',
  'css',
  'csv',
  'eot',
  'gif',
  'gz',
  'ico',
  'jpeg',
  'jpg',
  'js',
  'json',
  'map',
  'mjs',
  'mp3',
  'mp4',
  'ogg',
  'otf',
  'pdf',
  'png',
  'svg',
  'ttf',
  'txt',
  'wasm',
  'wav',
  'webm',
  'webmanifest',
  'webp',
  'woff',
  'woff2',
  'xml',
  'zip',
])

/** How a host should read a request that no static file answered.
 *
 * `PathAsset`: the path names an asset, whatever the request headers say, so a
 * refusal is the same for every client and needs no `Vary`.
 *
 * `DestinationAsset`: the path could be a page, and only the request's
 * `Sec-Fetch-Dest` says otherwise. A refusal here depends on that header, so it
 * has to declare it in `Vary` before a shared cache may store it: a cross-site
 * script request would otherwise seed a cached 404 for a real page.
 *
 * `Page`: nothing marks it as an asset, so the usual `Accept` negotiation
 * decides.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RequestClassification = 'PathAsset' | 'DestinationAsset' | 'Page'

/**
 * Classifies a request that no static file answered, from its path and, when
 * the client sent one, its `Sec-Fetch-Dest`.
 *
 * A host answers a static miss by content negotiation, and a browser requests
 * scripts, stylesheets, and images with `Accept: *​/*`, which accepts HTML. A
 * request for a hashed asset that is no longer deployed would therefore be
 * answered with the application shell at 200, so a stale bundle reads as a
 * blank page rather than the 404 it is.
 *
 * The path is read first, so a request the URL alone settles is never made to
 * depend on a header the client may or may not send.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const classifyRequest = (
  requestUrl: string,
  fetchDestination?: string,
): RequestClassification => {
  let pathname: string
  try {
    pathname = new URL(requestUrl, 'http://localhost').pathname
  } catch {
    pathname = ''
  }
  // Read the path a static file server would resolve, not the raw one. A file
  // server percent-decodes before it looks for a file, so `/assets/a%2Ejs` and
  // `/assets/a.js` name the same asset; classifying the raw form reads the
  // first as an ordinary page and answers a missing bundle with the shell.
  try {
    pathname = decodeURIComponent(pathname)
  } catch {
    // An undecodable path names no file, so leave it as written.
  }
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1)
  const separator = lastSegment.lastIndexOf('.')
  if (
    separator > 0 &&
    ASSET_EXTENSIONS.has(lastSegment.slice(separator + 1).toLowerCase())
  ) {
    return 'PathAsset'
  }
  if (
    fetchDestination !== undefined &&
    SUBRESOURCE_FETCH_DESTINATIONS.has(fetchDestination.trim().toLowerCase())
  ) {
    return 'DestinationAsset'
  }
  return 'Page'
}

/**
 * Decides whether a request path resolves to the `index.html` template, the
 * way a static file server resolves it: percent-decoded, backslashes and
 * repeated separators collapsed, and dot segments resolved. A host renders the
 * application for such a request rather than serving the raw, unfilled
 * template, so `/`, `/index.html`, `/%2findex.html`, and `/foo/../index.html`
 * all resolve to it. An undecodable or null-byte path resolves to nothing.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const resolvesToIndexHtml = (requestUrl: string): boolean => {
  let pathname: string
  try {
    pathname = new URL(requestUrl, 'http://localhost').pathname
  } catch {
    return false
  }
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return false
  }
  if (decoded.includes('\0')) {
    return false
  }
  const normalized = normalizePath(decoded.replace(/\\/g, '/'))
  return normalized === '' || normalized.toLowerCase() === 'index.html'
}

/**
 * The answer a host gives for the methods it cannot hand to a server entry.
 *
 * The WHATWG `Request` constructor rejects `CONNECT`, `TRACE`, and `TRACK`, so
 * an entry can never be handed one: forwarding it turns a malformed request
 * into a 500. A host refuses them itself, with `405` and an `Allow` header
 * naming what it does forward.
 *
 * On Node only `TRACE` reaches this rule. The HTTP parser rejects `TRACK` with
 * a 400 before any handler runs, and `CONNECT` arrives on its own event rather
 * than as an ordinary request. Both are named anyway, so a host on another
 * runtime refuses them rather than handing one to `new Request`.
 *
 * Every other method reaches the entry, `OPTIONS` included. A preflight is a
 * question about a resource, so the application answers it: the entry can allow
 * one origin for one route and refuse it for another, which no host-level
 * policy could express. The Vite dev host applies Vite's CORS option only to
 * Vite-owned modules and assets. An application preflight therefore reaches
 * the entry rather than middleware a deployed host has no counterpart for.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const HOST_METHOD_ANSWERS: Readonly<{
  refusedStatus: number
  allow: string
}> = {
  refusedStatus: 405,
  allow: 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
}

/**
 * Whether a host refuses this method itself instead of calling the server
 * entry. See {@link HOST_METHOD_ANSWERS}.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const isHostSettledMethod = (method: string): boolean => {
  const normalized = method.toUpperCase()
  return (
    normalized === 'CONNECT' || normalized === 'TRACE' || normalized === 'TRACK'
  )
}
