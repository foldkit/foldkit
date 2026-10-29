---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': minor
'@foldkit/node': minor
'@foldkit/markdown': minor
'@foldkit/vite-plugin': minor
'@foldkit/devtools-mcp': minor
'create-foldkit-app': minor
'@foldkit/oxlint-plugin': patch
---

Upgrade Foldkit and its companion packages to Effect 4.1. Published Effect dependencies and peer dependencies accept 4.1 patch releases through `~4.1.0` ranges. The workspace and new SPA, SSG, and SSR projects use the verified `4.1.0` release.

Update `effect` and every `@effect/*` runtime or test package in your app to a compatible 4.1 release together. Effect 4.1 replaces `Crypto.Crypto` with services in `effect/crypto`. For UUIDs, import `SecureRandom` from `effect/crypto`, acquire `SecureRandom.SecureRandom`, and call `secureRandom.uuidV4()`. Provide `BrowserCrypto.layerSecureRandom` or `NodeCrypto.layerSecureRandom`; UUID generation has no error channel and does not need `Effect.orDie`. Foldkit's Vite plugin, examples, scaffold guidance, and lint diagnostics use this API.

Effect minor upgrades are reviewed explicitly because they can change APIs. Patch releases within 4.1 are accepted without requiring a new Foldkit release.

The Node adapter, Vite plugin, and DevTools MCP server require Node.js 22.19.0 or newer, matching the Effect 4.1 Node platform packages. Upgrade Node.js before installing these packages on Node.js 20. The Node adapter explicitly constrains `@effect/platform-node-shared` to 4.1 as well, matching the CLI and Vite plugin, so npm can resolve the Node platform packages within the supported Effect minor.

Effect 4.1 starts `Stream.callback` setup immediately. For asynchronous Mount acquisition that must stop on unmount, pass `{ interruptible: true }` as the third argument to `Effect.acquireRelease` and construct the handle after the interruptible wait. The map example and chart integration guide use this option so unmounting during a library import does not construct a handle on a detached element.
