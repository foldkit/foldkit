import type { RenderedApplication } from './server.js'
import {
  type InjectIntoTemplateOptions,
  injectIntoTemplate,
} from './template.js'

/** Optional HTTP metadata for a rendered application.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderedOptions = Readonly<{
  status?: number
  headers?: HeadersInit
}>

/** A server entry result whose application markup still needs to be placed in
 * the host's HTML template.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type Rendered = Readonly<{
  _tag: 'Rendered'
  application: RenderedApplication
  status?: number
  headers?: HeadersInit
}>

/** Constructs a rendered server entry result with optional HTTP status and
 * headers.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const Rendered = (
  application: RenderedApplication,
  options?: RenderedOptions,
): Rendered => ({
  _tag: 'Rendered',
  application,
  ...(options?.status !== undefined ? { status: options.status } : {}),
  ...(options?.headers !== undefined ? { headers: options.headers } : {}),
})

/** A server entry result that bypasses application rendering and returns a
 * complete Web `Response`, such as a redirect or an API response.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type Responded = Readonly<{
  _tag: 'Responded'
  response: Response
}>

/** Constructs a complete Web `Response` server entry result.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const Responded = (response: Response): Responded => ({
  _tag: 'Responded',
  response,
})

/** The result of handling one request through a Foldkit server entry.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ServerEntryResult = Rendered | Responded

/** The module shape a Foldkit server entry exports for hosts to call: one Web
 * `Request` in, one delivery result out.
 *
 * The outer boundary is a `Promise` so Vite, build scripts, serverless
 * functions, and long-running HTTP hosts can call it without owning the
 * application's Effect requirements. The entry may use Effect internally and
 * settles that work before returning. Rendering itself must run in the same
 * Foldkit module instance as the application's view because the HTML builder's
 * render frame is module-local.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ServerEntryModule = Readonly<{
  renderPage: (request: Request) => Promise<ServerEntryResult>
}>

/** Turns a server entry result into the Web `Response` a host sends. Rendered
 * applications are injected into the supplied template and default to status
 * 200 with a UTF-8 HTML content type. Complete responses pass through
 * unchanged.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const toResponse = (
  template: string,
  result: ServerEntryResult,
  options?: InjectIntoTemplateOptions,
): Response => {
  if (result._tag === 'Responded') {
    return result.response
  }

  const headers = new Headers(result.headers)
  if (!headers.has('content-type')) {
    headers.set('content-type', 'text/html; charset=utf-8')
  }

  return new Response(
    injectIntoTemplate(template, result.application, options),
    {
      status: result.status ?? 200,
      headers,
    },
  )
}
