# @foldkit/vite-plugin

Vite plugin for Foldkit: view identity branding for the differ, plus hot module reloading with Model preservation.

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

## Hot module reloading

When you save a file during development, the plugin:

1. Preserves your application's current Model
2. Triggers a full page reload
3. Restores the preserved Model after reload

Code changes do not reset the application. Forms stay filled, counters keep their values, and games keep their positions.

## How it works

The plugin uses Vite's WebSocket connection to communicate between the dev server and browser:

- **On file change**: The browser sends the current Model to the Vite server for preservation.
- **On reload**: The browser requests the preserved Model from the server and initializes the Foldkit Runtime with it.

The Model survives hot reloads but clears on a manual browser refresh, so a refresh still resets the application.

## Server rendering dev host

Pass `ssr` with the path to your server entry to render page requests through it during development:

```typescript
plugins: [foldkit({ ssr: { serverEntry: '/src/entry.server.ts' } })]
```

With this set, the dev server converts HTML page requests to Web `Request` values, passes them to the entry's `renderPage`, and serves the returned `Response`. The request URL retains Vite's configured `base` prefix and the browser's query string. Vite continues to serve the client entry, HMR, and assets, and the server entry runs through Vite's module graph, so edits to it apply without a restart. The client side of the handoff needs no plugin configuration: a server-rendered application's client entry calls `Runtime.hydrate` instead of `Runtime.run`. Hydration adopts matching DOM, rebuilds mismatched subtrees, and refuses an invalid or cross-deployment handoff. The option shapes only the dev server; production hosts import the built server entry themselves. See the [Server Rendering documentation](https://foldkit.dev/core/server-rendering) for the full contract.

Vite retains ownership of configured proxy routes before Foldkit handles application requests. Vite's `server.cors` option applies to Vite-owned source modules, assets, and HMR. It does not add headers to application responses or answer their preflights. Preflight ownership follows `Access-Control-Request-Method`, so a preflight for an application `POST` reaches `renderPage` even when its path looks like an asset. An `OPTIONS` request without both `Origin` and `Access-Control-Request-Method` is not a preflight and also reaches `renderPage`. Define application CORS in `renderPage`, where development and the deployed host share one policy. Vite's `allowedHosts` check runs before proxy and application handling, including `OPTIONS` and methods the Web `Request` API cannot represent.

## Build id

The build id does not make hydration correct. It makes hydration refuse when it would otherwise be incorrect.

Server-rendered HTML carries the deployment id, and the client bundle carries its own copy. `Runtime.hydrate` compares them before reading the Flags payload or adopting DOM. When they differ, startup stops and the document body is marked `inert`, `aria-hidden`, and `data-foldkit-refused`. A nondismissable modal shield covers its controls and existing top-layer content, then takes focus without closing author-owned dialogs.

Nothing moves, so no custom element reconnects and no frame reloads. The containment blocks native page interaction; it is not a script or global-event sandbox. A client already running in an open tab is not rechecked when a deployment lands because the comparison happens only when a client boots against a page.

The plugin compiles the id into application code as `import.meta.env.FOLDKIT_BUILD_ID`, from its `buildId` option or from the `FOLDKIT_BUILD_ID` environment variable:

```typescript
plugins: [foldkit({ buildId: process.env.DEPLOYMENT_SHA })]
```

The entries pass it explicitly, because Vite externalizes an installed dependency from a server build, where a compile-time define never reaches the framework itself:

```typescript
// src/entry.server.ts
Server.renderToString(config, {
  flags,
  buildId: import.meta.env.FOLDKIT_BUILD_ID,
})

// src/entry.ts
Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })
```

Use a public value the deployment already has, such as a commit, release tag, or container digest. Three things have to be true:

- The id appears in the HTML every visitor receives, so it must never contain a secret.
- Two deployments must never share an id.
- The same value must reach the client and server builds, which run as separate commands.

A hydratable render given no id fails with `MissingBuildId`. Only a build takes the id from the deployment. The dev server compiles a fixed one because one live source session supplies both transforms and has no deployment identity to derive.

The standalone `foldkitSsr({ serverEntry, buildId })` export compiles the same define for its server entry. When it runs in development without an explicit value, it uses the fixed development id too. The aggregate `foldkit({ buildId, ssr })` plugin passes its top-level value through automatically.

## DevTools overlay

When `@foldkit/devtools` is installed as a development dependency, the plugin mounts its overlay automatically during development and leaves it out of production builds. No application import or `devTools.overlay` field is needed.

To include the overlay in production, list `@foldkit/devtools` in regular `dependencies` and set `devTools.show` to `'Always'`. Dependency placement controls whether Vite includes the overlay, and `show` controls whether the Foldkit Runtime mounts it.

## DevTools MCP relay

Pass `devToolsMcpPort` to enable the relay that exposes your running Foldkit app to AI agents via the [`@foldkit/devtools-mcp`](https://www.npmjs.com/package/@foldkit/devtools-mcp) MCP server:

```typescript
plugins: [foldkit({ devToolsMcpPort: 9988 })]
```

When set, the plugin opens a separate WebSocket server on the given port. The MCP server connects to it and forwards typed `Request` and `Response` frames between AI agents and your Runtime. Without `devToolsMcpPort` (the default), the relay is not started and the plugin behaves exactly as before.

See the [DevTools MCP documentation](https://foldkit.dev/ai/mcp) for setup, the available tools, and how dispatch validation works.

## License

MIT
