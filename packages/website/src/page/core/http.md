# Http

## Overview

The `Http` module has one export: `Http.layer`, a Fetch-backed Effect `HttpClient` Layer with trace-header propagation disabled by default. Provide it from the application root, then yield `HttpClient.HttpClient` inside an HTTP [Command](/core/commands).

Import client modules from `effect/http`, their path in Effect 4 stable.

## Why Propagation Is Off

Effect records an `http.client` span for each request. Its standard Fetch client also propagates the span context through `traceparent` and `b3` request headers. That default suits a server calling downstream services that participate in the same distributed trace.

In a browser, those extra headers can turn an otherwise CORS-simple cross-origin request into a preflighted request. `Http.layer` disables propagation so tracing alone does not change the request's CORS behavior.

Local observability remains intact. The `http.client` span still records request method, URL, and status, and a Foldkit app nests it under the Command span. Only the outgoing trace-context headers are removed.

## Providing It to the Application

Leave `HttpClient.HttpClient` in each handler's Effect requirements. Compose the handlers into `HandlersLayer`, then provide `Http.layer` beneath that bundle at the application root. The root owns the concrete browser transport, and a whole-application test can provide a deterministic HTTP client beneath the same handlers. See [Application Layers](/core/resources) for service and handler composition.

The Command remains responsible for status checks, response decoding, and converting failures into declared Messages.

::Snippet{name="counterHttpCommand" label="HTTP Command"}

## Customizing the Client

`Http.layer` supplies an overridable default to `FetchHttpClient.layer`, so Effect's normal client customization remains available. Provide `FetchHttpClient.Fetch` to substitute a custom `fetch` implementation. Set `HttpClient.TracerPropagationEnabled` to `true` for a Command that participates in distributed tracing.

Transform a yielded client with helpers such as `HttpClient.mapRequest` to add authentication headers or prepend a base URL. Use `HttpClient.retry` or `HttpClient.retryTransient` for request retry policies. Put a custom transport or shared configured client in the root provider graph.

## Full API Surface

The [Http API reference](/api-reference/http) lists `Http.layer` with its full signature.
