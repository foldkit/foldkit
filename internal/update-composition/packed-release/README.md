# Packed release-version rehearsal

The final artifacts passed the existing CI packed SSR consumer gate in
Chromium, Firefox and WebKit. A separate packed TypeScript 6 check also passed
the new public update-composition fixtures. Earlier release rehearsals remain
below. All runs used the pending release versions. Active package versions,
peer ranges, source and distribution files were unchanged. Nothing was published.

## Staging

The isolated staging workspace contained exact `npm pack` contents from the seven
built packages. Versions came from the real current Changesets metadata, using
the installed CLI’s `getPackages`, `readConfig`, `readChangesets` and
`assembleReleasePlan` dependencies. The initial rehearsal read 200 changesets;
the final snapshot reads 203. The existing
`scripts/lib/coherent-release.mjs` `packageJsonsForPacking` helper resolved
workspace dependencies in those staged manifests. Peer declarations were
asserted unchanged. No empty plan, synthetic Git ref, peer override or source
version edit was used.

| Package               | Source version | Rehearsal version |
| --------------------- | -------------- | ----------------- |
| foldkit               | 0.170.0        | 0.171.0           |
| @foldkit/ui           | 0.170.0        | 0.171.0           |
| @foldkit/devtools     | 0.170.0        | 0.171.0           |
| @foldkit/devtools-mcp | 0.26.0         | 0.27.0            |
| @foldkit/markdown     | 0.15.0         | 0.15.1            |
| @foldkit/node         | 0.2.0          | 0.2.1             |
| @foldkit/vite-plugin  | 0.29.0         | 0.29.1            |

The final snapshot followed the completed core public-boundary build containing
`UpdateStage` and `CompositionMetadata` type exports. The six companion
artifacts came from the completed public-package build. The driver was copied
unchanged and ran with `--skip-build` to preserve those frozen artifacts.

## Run

From the temporary staged repository, using Node 22.22.3 on PATH:

```sh
NODE_DISABLE_COMPILE_CACHE=1 \
  npm_config_cache=/private/tmp/foldkit-packed-adoption-npm-cache \
  node scripts/check-packed-ssr-consumer.ts --skip-build
```

The sandbox-only first install encountered registry DNS `ENOTFOUND` and was
stopped before starting a browser or server. The authorized network/local-browser
retry passed. No consumer fixture, npm strictness or peer floor was changed.

## Result

PASS, default Chromium scope:

- Strict external npm install, valid peers and `npm ls`.
- One physical Effect runtime across 12 resolutions; Effect, platform-browser,
  platform-node and platform-node-shared are exactly 4.1.0.
- Public entrypoints, source-free declaration checks and consumer declaration
  emission, inferred Programs and the shared-Model npm workspace.
- Packed Vite development relay and two production client/SSR deployments.
- Bundled Foldkit singletons and Markdown, installed UI/Markdown SSR, no
  source-derived identity digest.
- Real Chromium DOM adoption, custom elements, ownership release/reset, strict
  CSP, stale/malformed handoff refusal, inert containment and lifecycle checks.

The browser closed, the temporary consumer and all seven gate tarballs were
removed, and port 5199 was free. Post-run hashes confirm that all seven active
manifests and complete distribution trees remain unchanged. The exact versioned
tarball and distribution hashes are in [receipt.json](./receipt.json).

This is a temporary release rehearsal. It does not publish packages, alter the
active workspace’s versions, or expand the existing browser/version matrix.
The temporary staging workspace and preparatory scripts remain local evidence;
no copied package sources, dependencies or distribution snapshots are included
in this proof directory.

## Final Relay CI snapshot

The refreshed final artifacts passed the existing CI command:

```sh
node scripts/check-packed-ssr-consumer.ts --skip-build --critical-browser-matrix
```

The real current metadata contains **201 changesets**, including the final relay
liveness wording. It was reread from the unchanged canonical source versions
after timing ended; the already versioned staged manifests were not bumped again.
All seven planned versions remain those in the table above. Metadata and artifact
hashes were revalidated before installation, so the prose-only correction required
no new distribution build or staged input repack.

The final gate passed strict peers, the four exact 4.1.0 dependency versions,
one physical Effect runtime across 12 resolutions, source-free types and
consumer declaration emission, the shared-Model npm workspace, the packed relay,
two production builds and SSR. The complete default Chromium checks passed,
followed by the existing critical Firefox and WebKit checks for stale handoffs,
inert containment, top layers and lifecycle behavior. Cached browsers were used;
no browser download or new matrix assertions were introduced.

All browsers closed, the temporary consumer and seven gate tarballs were removed,
and port 5199 was free. All active manifests and distribution trees stayed
unchanged. The source package versions and peer ranges were preserved.

[receipt-relay-critical.json](./receipt-relay-critical.json) records the final
201-change plan hash, final relay changeset hash, exact distribution/tarball
hashes and scope. The original [receipt.json](./receipt.json) remains the earlier
200-change default-Chromium snapshot. Neither rehearsal publishes packages.

## Final public types and UI snapshot

The final snapshot contains **203 changesets**, the three named public helper
exports needed by TypeScript 6, and the completed UI portal/Menu runtime fixes.
The planned package versions remain those in the table above. The core's 350
JavaScript files are byte-identical to the earlier three-browser snapshot; four
core declaration files changed. The UI runtime changes received a fresh full
packed browser run.

The isolated type-only harness reused the current packed driver's helpers for
packing, project creation, strict installation, Effect identity and declaration
checking. It added the actual public update-composition acceptance, consumption
and rejection fixtures. TypeScript **6.0.3** accepted the extracted
`makeUpdate`, `makeFieldsStep` and `makeCommandsStep` exports without application
annotations. The inferred Program/Machine and npm workspace consumers passed.
The earlier stale-validator rejection and three TS6 nameability failures remain
recorded in [receipt-public-types.json](./receipt-public-types.json).

The unchanged CI command then passed on exactly the same seven tarballs:

```sh
node scripts/check-packed-ssr-consumer.ts --skip-build --critical-browser-matrix
```

The gate passed strict peers, the four exact 4.1.0 dependency versions, one
physical Effect runtime across 12 resolutions, direct entrypoints, source-free
types, the workspace consumer, the development relay, two production SSR builds,
full Chromium checks and the existing critical Firefox/WebKit checks. The
consumer and gate tarballs were removed, port 5199 had no listener, and all seven
active manifests and distribution trees remained unchanged.

[receipt-final-ui-critical.json](./receipt-final-ui-critical.json) records the
203-change metadata hash, exact package and tarball hashes, commands, scope and
cleanup. It supersedes the earlier browser receipts for the current artifacts
while retaining those earlier receipts as evidence of their own snapshots.
