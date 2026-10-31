# Http

## Overview

The `Http` module has one export: `Http.layer`, a Fetch-backed Effect `HttpClient` Layer with trace-header propagation disabled by default. Provide it from the application root, then yield `HttpClient.HttpClient` in the constructor of a Block whose [Commands](/core/commands) make requests.

Import client modules from `effect/http`, their path in Effect 4 stable.

## Why Propagation Is Off

### Server Default

Effect records an `http.client` span for each request. Its standard Fetch client also propagates the span context through `traceparent` and `b3` request headers. That default suits a server calling downstream services that participate in the same distributed trace.

### Browser CORS

In a browser, those extra headers can turn an otherwise CORS-simple cross-origin request into a preflighted request. `Http.layer` disables propagation so tracing alone does not change the request's CORS behavior.

### Local Spans

Local observability remains intact. The `http.client` span still records request method, URL, and status, and a Foldkit app nests it under the Command span. Only the outgoing trace-context headers are removed.

## Providing It to the Application

Yield `HttpClient.HttpClient` in the constructor of each Block whose Commands make requests, and close over it in their handlers. The Block's Layer then requires `HttpClient`, and the root supplies `Http.layer` through `ApplicationLayer`. The root owns the concrete browser transport, and a test can provide a deterministic HTTP client to the same Block Layers. See [Layers](/core/layers) for how services reach Blocks.

The Command remains responsible for status checks, response decoding, and converting failures into declared Messages.

::Snippet{name="counterHttpCommand" label="Fetching and decoding a count"}

## Customizing the Client

`Http.layer` supplies an overridable default to `FetchHttpClient.layer`, so Effect's normal client customization remains available. Provide `FetchHttpClient.Fetch` to substitute a custom `fetch` implementation. Set `HttpClient.TracerPropagationEnabled` to `true` for a Command that participates in distributed tracing.

Transform a yielded client with helpers such as `HttpClient.mapRequest` to add authentication headers or prepend a base URL. Use `HttpClient.retry` or `HttpClient.retryTransient` for request retry policies. Put a custom transport or shared configured client in the root provider graph.

## Full API Surface

The [Http API reference](/api-reference/http) lists `Http.layer` with its full signature.
