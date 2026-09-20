import { type EntryResult, toResponse } from './entry.js'
import {
  HOST_METHOD_ANSWERS,
  acceptsHtml,
  classifyRequest,
  isHostSettledMethod,
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

/**
 * Answers one request as a Web `fetch` handler: refuse methods the
 * `Request` constructor cannot represent, classify a static miss so a
 * hashed asset is not answered with the application shell, and otherwise
 * call `renderPage`.
 *
 * Static files are the platform's job. This function is what remains
 * after Vite, a file server, or Worker assets have already missed.
 * Node and workerd both call it, so development predicts production.
 *
 * `Request.url` is trusted as the platform constructed it. On Workers and
 * Deno that is the URL the platform resolved. A Node adapter receives a raw
 * request target instead, which may be an absolute URL or a network-path
 * reference naming another host, so the adapter resolves that target
 * against its configured origin with `resolveRequestUrl` and refuses an
 * off-origin one before constructing the `Request` it passes here.
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

  const requestUrl = request.url
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

  const result = await options.renderPage(request)
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
