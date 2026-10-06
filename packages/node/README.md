# @foldkit/node

`@foldkit/node` starts a built Foldkit server-rendered application on Node.
It reads `foldkit.build.json` to find the client output and Fetch handler.

## Install

```bash
npm install @foldkit/node @effect/platform-node
```

## Serve a build

Build the application with `vite build`, then run a Node entry point such as:

```ts
import { Config, Option, String } from 'effect'

import { NodeRuntime } from '@effect/platform-node'
import * as Node from '@foldkit/node'

const port = Config.withDefault(Config.Port('PORT'), 3000)
const origin = Config.option(Config.String('ORIGIN')).pipe(
  Config.map(Option.filter(String.isNonEmpty)),
)

NodeRuntime.runMain(Node.serve({ port, origin }))
```

`origin` is the public URL of the deployment. When it is `None`, the adapter
uses `http://localhost:<port>`. Set it behind a proxy or TLS terminator so the
server entry receives the public `Request.url`.
The supplied value must be an HTTP or HTTPS origin without credentials, a path,
query, or fragment. Invalid values fail during startup.

The adapter serves matching client files only for `GET` and `HEAD`. It sends
the Vite-base `index.html` path, such as `/app/index.html` for `/app/`, and
every request that does not match a static file to the Fetch handler. It does
not choose a `Cache-Control` policy or replace application 404 responses.

Pass `manifestPath` to `serve` when the manifest is not at
`dist/server/foldkit.build.json` relative to the process working directory.
When the server output is outside the Vite root, also pass `rootDirectory` so
the adapter can locate the client output recorded by the manifest.

For a Vite application built with a root-relative `base` such as `/app/`, pass
the same value as `basePath`. The adapter serves client files only under that
path and preserves it in URLs passed to the Fetch handler.
