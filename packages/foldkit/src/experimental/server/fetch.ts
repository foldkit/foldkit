import { type EntryResult, toResponse } from './entry.js'
import {
  HOST_METHOD_ANSWERS,
  acceptsHtml,
  classifyRequest,
  isHostSettledMethod,
  resolveRequestUrl,
  resolvesToIndexHtml,
  varyWith,
  varyWithAccept,
} from './host.js'
import type { InjectIntoTemplateOptions } from './template.js'

/** How {@link handleRequest} renders a page request.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type HandleRequestOptions = Readonly<{
  /**
   * The application's server entry. One Web `Request` in, one delivery
   * result out.
   */
  renderPage: (request: Request) => Promise<EntryResult>
  /**
   * The unfilled HTML shell. Rendered markup is placed into its container.
   */
  template: string
  /**
   * The origin this host serves, such as `'https://app.example'`. The
   * entry sees it as `Request.url`. A target that resolves anywhere else
   * is refused, so a client cannot choose the redirects or cookie domains
   * the entry builds from the URL.
   *
   * Omit it when the platform already constructed `Request.url` (Workers,
   * Deno). Node adapters that resolve a raw request target against a
   * configured origin should pass that origin.
   */
  origin?: string
  /**
   * The `id` of the empty container in {@link template} the rendered
   * markup replaces. Defaults to `'root'`.
   */
  containerId?: string
}>

const withNegotiatedVary = (response: Response): Response => {
  const headers = new Headers(response.headers)
  headers.set(
    'vary',
    varyWith(
      varyWithAccept(headers.get('vary') ?? undefined),
      'Sec-Fetch-Dest',
    ),
  )
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

const emptyResponse = (status: number, headers?: HeadersInit): Response => {
  if (headers === undefined) {
    return new Response(null, { status })
  }
  return new Response(null, { status, headers })
}

const injectOptions = (
  containerId: string | undefined,
): InjectIntoTemplateOptions | undefined =>
  containerId === undefined ? undefined : { containerId }

const platformRequestUrl = (requestUrl: string): string | undefined => {
  let resolved: URL
  try {
    resolved = new URL(requestUrl)
  } catch {
    return undefined
  }
  if (resolved.username !== '' || resolved.password !== '') {
    return undefined
  }
  return resolved.href
}

const pageUrl = (
  requestUrl: string,
  origin: string | undefined,
): string | undefined => {
  if (origin === undefined || origin === '') {
    return platformRequestUrl(requestUrl)
  }
  return resolveRequestUrl(requestUrl, origin)
}

/**
 * Answers one request as a Web `fetch` handler: refuse methods the
 * `Request` constructor cannot represent, refuse a target that names
 * another origin when one is configured, classify a static miss so a
 * hashed asset is not answered with the application shell, and otherwise
 * call `renderPage`.
 *
 * Static files are the platform's job. This function is what remains
 * after Vite, a file server, or Worker assets have already missed.
 * Node and workerd both call it, so development predicts production.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const handleRequest = async (
  request: Request,
  options: HandleRequestOptions,
): Promise<Response> => {
  if (isHostSettledMethod(request.method)) {
    return emptyResponse(HOST_METHOD_ANSWERS.refusedStatus, {
      allow: HOST_METHOD_ANSWERS.allow,
    })
  }

  const requestUrl = pageUrl(request.url, options.origin)
  if (requestUrl === undefined) {
    return emptyResponse(400)
  }

  const pageRequest = new Request(requestUrl, request)
  const method = request.method.toUpperCase()
  const isGetOrHead = method === 'GET' || method === 'HEAD'

  let negotiated = false
  if (isGetOrHead && !resolvesToIndexHtml(requestUrl)) {
    const classification = classifyRequest(
      requestUrl,
      request.headers.get('sec-fetch-dest') ?? undefined,
    )
    if (classification === 'PathAsset') {
      return emptyResponse(404)
    }
    if (classification === 'DestinationAsset') {
      return emptyResponse(404, {
        vary: varyWith(undefined, 'Sec-Fetch-Dest'),
      })
    }
    negotiated = true
    if (!acceptsHtml(request.headers.get('accept') ?? undefined)) {
      return emptyResponse(404, {
        vary: varyWith(varyWithAccept(undefined), 'Sec-Fetch-Dest'),
      })
    }
  }

  const result = await options.renderPage(pageRequest)
  const rendered = toResponse(
    options.template,
    result,
    injectOptions(options.containerId),
  )
  let response = rendered
  if (method === 'HEAD') {
    response = emptyResponse(rendered.status, rendered.headers)
  }
  if (negotiated) {
    return withNegotiatedVary(response)
  }
  return response
}
