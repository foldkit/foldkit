# @foldkit/vite-plugin

Vite plugin for Foldkit: view identity branding for the differ, plus state-preserving live reload.

## Installation

```bash
npm install -D @foldkit/vite-plugin
# or
pnpm add -D @foldkit/vite-plugin
# or
yarn add -D @foldkit/vite-plugin
```

## Usage

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

export default defineConfig({
  plugins: [foldkit()],
})
```

## View identity

Foldkit's differ tracks two independent kinds of identity: user keys, which match siblings in dynamic lists, and a framework-managed identity, which decides whether a matched position is still the same thing. When the producing view function changes, the differ replaces the node instead of patching it, so DOM state cannot bleed across an identity change. Branches rendered inline by one view function share that function's identity and patch in place, exactly as same-type elements do in React; extracting the branches into named view functions makes them identity boundaries.

This plugin supplies that identity. At build time, in dev and production alike, it wraps every function return in your application modules with a branding call that stamps returned vnodes with the function's id (module path plus function name), set-if-absent. The identity is nothing else: it ships in the client bundle, so anything derived from the module's contents would be a published check against those contents. Identity therefore attaches at view-function boundaries, and any branching syntax behaves the same: if/else, ternaries, Effect Match, switch statements, and pattern-matching libraries are all equivalent, because identity belongs to the function that produced the subtree, not to the branch that selected it.

Foldkit core modules are never instrumented, and functions that never return vnodes are wrapped inertly. Builds without this plugin fall back to positional matching plus keys, where branch points need hand-written keys.

## State-preserving live reload

When you save a file during development, the plugin:

1. Preserves your application's current Model
2. Triggers a full page reload
3. Restores the preserved Model after reload

Code changes do not reset the application. Forms stay filled, counters keep their values, and games keep their positions.

## How it works

The plugin uses Vite's WebSocket connection to communicate between the dev server and browser:

- **On file change**: The browser sends the current Model to the Vite server for preservation.
- **On reload**: The browser requests the preserved Model from the server and initializes the Foldkit Runtime with it.

The Model survives development reloads but clears on a manual browser refresh, so a refresh still resets the application.

## Server rendering dev host

Pass `ssr` with the path to your server entry to render page requests through it during development:

```typescript
plugins: [foldkit({ ssr: { serverEntry: '/src/entry.server.ts' } })]
```

With this set, the dev server converts HTML page requests to Web `Request` values, passes them to the entry's `renderPage`, and serves the returned `Response`. The request URL retains Vite's configured `base` prefix and the browser's query string. Vite continues to serve the client entry, HMR, and assets, and the server entry runs through Vite's module graph, so edits to it apply without a restart. The client side of the handoff needs no plugin configuration: a server-rendered application's client entry calls `Runtime.hydrate` instead of `Runtime.run`. Hydration adopts matching DOM, rebuilds mismatched subtrees, and refuses an invalid or cross-deployment handoff. The option shapes only the dev server; production hosts import the built server entry themselves. See the [Server Rendering documentation](https://foldkit.dev/core/server-rendering) for the full contract.

Vite retains ownership of configured proxy routes before Foldkit handles application requests. Vite's `server.cors` option applies to Vite-owned source modules, assets, and HMR. It does not add headers to application responses or answer their preflights. Preflight ownership follows `Access-Control-Request-Method`, so a preflight for an application `POST` reaches `renderPage` even when its path looks like an asset. An `OPTIONS` request without both `Origin` and `Access-Control-Request-Method` is not a preflight and also reaches `renderPage`. Define application CORS in `renderPage`, where development and the deployed host share one policy. Vite's `allowedHosts` check runs before proxy and application handling, including `OPTIONS` and methods the Web `Request` API cannot represent.

## Completed build metadata

Deployment tools that run Vite in process can read `foldkit:build` through Vite's standard plugin `api` field. Await the full application build before reading:

```typescript
import type { FoldkitBuildApi } from '@foldkit/vite-plugin'
import { createBuilder } from 'vite'

const builder = await createBuilder()
await builder.buildApp()

const plugin = builder.config.plugins.find(
  plugin => plugin.name === 'foldkit:build',
)

if (plugin !== undefined) {
  const api: FoldkitBuildApi | undefined = plugin.api

  if (typeof api?.getBuildMetadata !== 'function') {
    throw new Error('This Foldkit version does not expose build metadata')
  }

  const metadata = api.getBuildMetadata()
  console.log(metadata.serverEntry)
  console.log(metadata.manifest.prerendered)
}
```

`FoldkitBuildApi` preserves `serverEntry` (the configured source entry) and `fetchModuleId` (the virtual fetch module). Its `getBuildMetadata()` method returns `FoldkitBuildMetadata`, exported as a Schema and inferred type:

| Field             | Meaning                                                 |
| ----------------- | ------------------------------------------------------- |
| `root`            | Absolute resolved application root                      |
| `clientDirectory` | Absolute resolved client output directory               |
| `serverDirectory` | Absolute resolved server output directory               |
| `serverEntry`     | Absolute path to the emitted fetch handler              |
| `manifest`        | The version-1 data also written to `foldkit.build.json` |

The snapshot, manifest, and prerendered route array are frozen. The data can be serialized to another process. The manifest keeps its portable relative POSIX paths; the outer path fields describe the local build machine. Output paths reflect the resolved Vite environments, including overrides made by a host plugin.

A client-only build has no `foldkit:build` plugin. A present plugin without the accessor needs a Foldkit upgrade. The accessor throws before Foldkit finalizes, while another client or server build is running, or after its build fails. Always await `builder.buildApp()` successfully: another plugin can fail after Foldkit has finalized. An environment's `writeBundle` and another plugin's post-order `buildApp` hook do not establish this completion boundary.

Create a fresh Foldkit plugin set for each independent builder. The build plugin uses Vite's `sharedDuringBuild` to share captures across its environments. Concurrent builders must not reuse the same plugin object. This API does not add watch-mode support.

Prerendered pages and `foldkit.build.json` are finalized after the environment bundles. A separate deployment process that consumes an existing build can continue reading the disk manifest. An integration that runs the build in a child process can read the API there and transfer the serialized metadata in its child result.

## Build id

The build id does not make hydration correct. It makes hydration refuse when it would otherwise be incorrect.

Server-rendered HTML carries the deployment id, and the client bundle carries its own copy. `Runtime.hydrate` compares them before reading the Flags payload or adopting DOM. When they differ, startup stops and the document body is marked `inert`, `aria-hidden`, and `data-foldkit-refused`. A nondismissable modal shield covers its controls and existing top-layer content, then takes focus without closing author-owned dialogs.

Nothing moves, so no custom element reconnects and no frame reloads. The containment blocks native page interaction; it is not a script or global-event sandbox. A client already running in an open tab is not rechecked when a deployment lands because the comparison happens only when a client boots against a page.

When one Vite app build produces the client and server artifacts, the plugin generates an opaque id and compiles it into Foldkit in both. The entries need no build-id wiring:

```typescript
// src/entry.server.ts
Server.renderToString(config, { flags })

// src/entry.ts
Runtime.hydrate(application)
```

Use the `buildId` option or `FOLDKIT_BUILD_ID` as an explicit override when client and server build in separate jobs, or when the id should name a deployment in another system:

```typescript
plugins: [foldkit({ buildId: process.env.DEPLOYMENT_ID })]
```

Three things have to be true:

- The id appears in the HTML every visitor receives, so it must never contain a secret.
- Two deployments must never share an id.
- Separate build jobs must receive the same explicit override.

A hydratable render with neither a compiled nor explicit id fails with `MissingBuildId`. The dev server generates an opaque id for its own client and server transforms.

The standalone `foldkitSsr({ serverEntry, buildId })` export retains explicit build-id support for separately orchestrated integrations. The aggregate `foldkit({ ssr })` plugin owns the automatic path.

## DevTools overlay

When `@foldkit/devtools` is installed as a development dependency, the plugin mounts its overlay automatically during development and leaves it out of production builds. No application import or `devTools.overlay` field is needed.

To include the overlay in production, list `@foldkit/devtools` in regular `dependencies` and set `devTools.show` to `'Always'`. Dependency placement controls whether Vite includes the overlay, and `show` controls whether the Foldkit Runtime mounts it.

## DevTools MCP relay

During development, the plugin starts a WebSocket relay for the [`@foldkit/devtools-mcp`](https://www.npmjs.com/package/@foldkit/devtools-mcp) server. Through the relay, an AI agent can inspect a running Foldkit app and dispatch Messages.

By default, the relay uses the dev server's listener at `/__foldkit/devtools-mcp`. The plugin publishes its address to a registry private to your user, and the MCP server finds it by project. You do not need to coordinate a port between them. The registry lives under `XDG_RUNTIME_DIR` when that is set, or under the operating system's temporary directory. `FOLDKIT_DEVTOOLS_RELAY_DIRECTORY` selects another directory.

The relay follows Vite's `server.host` setting. If you expose the dev server with `--host`, a client still needs the random token in the published address to inspect a Model or dispatch a Message. The plugin will not publish that token into a registry directory owned by another user or readable by other users. It reports the problem in the console.

In middleware mode, the relay uses a free loopback port because there is no HTTP server to share. It also uses a free loopback port for HTTPS dev servers, whose self-signed certificates the MCP server cannot verify. The plugin publishes these addresses for discovery in the same way.

To use a fixed port, set `devToolsMcpPort` in your Vite config:

```typescript
plugins: [foldkit({ devToolsMcpPort: 9988 })]
```

Set `FOLDKIT_DEVTOOLS_MCP_PORT` to the same value for the MCP server. A fixed port opens a separate socket on every interface and does not require a token. Use this setting on platforms where directory ownership cannot be verified, including Windows, because the plugin cannot publish a relay address there.

`devToolsMcpPort: false` disables the relay. The relay does not start during Vitest runs or in production builds.

See the [DevTools MCP documentation](https://foldkit.dev/ai/mcp) for setup, the available tools, and how dispatch validation works.

## License

MIT
