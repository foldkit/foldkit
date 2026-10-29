---
'foldkit': patch
'@foldkit/ui': patch
'@foldkit/node': patch
'@foldkit/markdown': patch
'@foldkit/vite-plugin': patch
'@foldkit/devtools': patch
'@foldkit/devtools-mcp': patch
'@foldkit/oxlint-plugin': patch
---

Accept the tested Effect versions through `4.0.0 || 4.0.6` peer ranges. The Foldkit and DevTools browser-platform peers accept the same two tested versions. Development and application dependencies remain exactly pinned. Additional releases need compatibility verification before joining the peer range; some upstream Crypto APIs are explicitly unstable and changed between these patches.

Pin the Node adapter's direct `@effect/platform-node-shared` dependency to 4.0.0 alongside `@effect/platform-node`. This prevents the platform package's transitive range from selecting a patch whose Effect peer excludes supported 4.0.0 applications. Applications must select platform releases whose own Effect peer ranges accept their chosen Effect version; no override or second Effect installation is required for the tested combinations.

Handle both supported Crypto UUID operation shapes when starting the Vite DevTools relay. Active lint guidance uses Crypto operations compatible with both tested Effect versions.
