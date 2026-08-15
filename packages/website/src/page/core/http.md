# Http

## Overview

The `Http` module has a single export, `Http.layer`: Effect’s Fetch-backed `HttpClient` with trace header propagation disabled by default. It is the browser-correct client to provide to an HTTP [Command](/core/commands). Yield `HttpClient.HttpClient` inside the Command and provide `Http.layer` at the edge of its Effect.

The snippet on this page imports from `effect/unstable/http`. In the Effect v4 release candidate that Foldkit pins, the `HttpClient` modules live under the unstable namespace, so that import path is expected and matches what Foldkit projects use.

## Why propagation is off

Effect’s `HttpClient` records an `http.client` span for every request and, by default, writes that span’s context onto the request as `traceparent` and `b3` headers. That default is tuned for servers, where propagating trace context to your own downstream services is desirable. In a browser those same headers make an otherwise CORS-simple request non-simple, so a plain API or a same-origin dev proxy suddenly sees a preflight. `Http.layer` defaults propagation off, so requests stay CORS-simple.

Local observability is unaffected. Disabling propagation removes only the outgoing `traceparent` and `b3` request headers: the `http.client` span with its method, URL, and status attributes is still recorded, and in a Foldkit app it still nests under the runtime’s Command span.

## Providing it in a Command

Provide `Http.layer` per Command with `Effect.provide`. It is a thin wrapper around `fetch`, so building it on each invocation costs nothing and the Command stays self-contained. When an app grows many HTTP Commands, or shares a derived client across modules, provide it once through [resources](/core/resources) instead.

::Snippet{name="counterHttpCommand" label="HTTP Command example"}

## Customizing the client

`Http.layer` folds one overridable default into `FetchHttpClient.layer`, so every seam Effect’s client exposes still works through it. Supply a custom `fetch` by also providing `FetchHttpClient.Fetch`. An app doing distributed tracing can re-enable propagation for one Command with `Effect.provideService(HttpClient.TracerPropagationEnabled, true)`. Add auth headers, a base URL, or retries by transforming the client with `HttpClient.mapRequest` at the call site. You would write your own layer only for a transport that is not `fetch`, which is unusual in the browser.

## Full API surface

The [Http API reference](/api-reference/http) lists the export with its full signature.
