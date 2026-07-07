---
'foldkit': minor
---

Add `foldkit/http`, a Fetch-backed `HttpClient` Layer with trace header propagation disabled by default.

Effect's `HttpClient` records an `http.client` span for every request and, by default, writes that span's context onto the request as `traceparent` and `b3` headers. That default is tuned for servers, where propagating trace context to your own downstream services is desirable. In a browser the same headers make otherwise CORS-simple requests trigger preflights against plain APIs and dev proxies, so providing `FetchHttpClient.layer` directly meant every HTTP Command hit this footgun. Foldkit apps are browser apps, and `Http.layer` ships the browser-correct default:

```ts
import { Http } from 'foldkit'

const FetchCount = Command.define(
  'FetchCount',
  SucceededFetchCount,
  FailedFetchCount,
)(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get('/api/count')
    const { count } = yield* S.decodeUnknownEffect(CountResponse)(
      yield* response.json,
    )
    return SucceededFetchCount({ count })
  }).pipe(
    Effect.catch(() =>
      Effect.succeed(FailedFetchCount({ error: 'Request failed' })),
    ),
    Effect.provide(Http.layer),
  ),
)
```

Local observability is unaffected: the `http.client` span with method, URL, and status attributes is still recorded, nesting under the runtime's Command span. Apps doing distributed tracing can re-enable propagation per Command with `Effect.provideService(HttpClient.TracerPropagationEnabled, true)`, or keep using `FetchHttpClient.layer` from Effect directly.
