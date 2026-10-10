import { Layer } from 'effect'
import { FetchHttpClient, HttpClient } from 'effect/http'

/**
 * A Fetch-backed `HttpClient` Layer with trace header propagation disabled by
 * default.
 *
 * Effect's `HttpClient` records an `http.client` span for every request and,
 * by default, writes that span's context onto the request as `traceparent`
 * and `b3` headers. That default is tuned for servers, where propagating
 * trace context to your own downstream services is desirable. In a browser
 * the same headers make otherwise CORS-simple requests non-simple, triggering
 * preflights against plain APIs and dev proxies that never expect them.
 * Foldkit apps run in the browser, so this Layer defaults propagation off and
 * requests stay CORS-simple.
 *
 * Local observability is unaffected: the `http.client` span with method, URL,
 * and status attributes is still recorded, and in a Foldkit app it nests
 * under the runtime's Command span. An app doing distributed tracing can
 * re-enable propagation per Command with
 * `Effect.provideService(HttpClient.TracerPropagationEnabled, true)`, or use
 * `FetchHttpClient.layer` from Effect directly.
 *
 * @example
 * ```typescript
 * import { Effect, Layer, Schema } from 'effect'
 * import { HttpClient } from 'effect/http'
 * import { Command, Http } from 'foldkit'
 *
 * const FetchCount = Command.define(
 *   'FetchCount',
 *   { messages: [Message.SucceededFetchCount, Message.FailedFetchCount] },
 *   Effect.gen(function* () {
 *     const client = yield* HttpClient.HttpClient
 *
 *     return () =>
 *       Effect.gen(function* () {
 *         const response = yield* client.get('/api/count')
 *         const { count } = yield* Schema.decodeUnknownEffect(CountResponse)(
 *           yield* response.json,
 *         )
 *         return Message.SucceededFetchCount({ count })
 *       }).pipe(
 *         Effect.catch(() =>
 *           Effect.succeed(Message.FailedFetchCount({ error: 'Request failed' })),
 *         ),
 *       )
 *   }),
 * )
 *
 * const AppLayer = FetchCount.layer.pipe(Layer.provide(Http.layer))
 * ```
 */
export const layer: Layer.Layer<HttpClient.HttpClient> = Layer.provide(
  FetchHttpClient.layer,
  Layer.succeed(HttpClient.TracerPropagationEnabled, false),
)
