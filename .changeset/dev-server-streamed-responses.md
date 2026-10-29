---
'@foldkit/vite-plugin': patch
---

The SSR dev server streams a `Server.Responded` body as the server entry produces it. Before, it read the whole body before sending anything, so server-sent events, an ndjson RPC stream, or any other body that stays open never reached the browser under `vite dev`, although `@foldkit/node` streamed it in production.

Chunks are written as they arrive, and reading pauses while the socket's write buffer is full. A client disconnect cancels the body's stream without logging a server error, and a `HEAD` response cancels the body, as under `@foldkit/node`.

The dev server sends the status and headers with the body's first chunk, so a body that errors before producing any bytes still gets Vite's error overlay. Until a stream sends that chunk, the client receives no status or headers, so a `fetch` does not resolve and an `EventSource` does not fire `open`. An SSE endpoint can send an initial comment line (`:\n\n`) to open right away.
