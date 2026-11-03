# Preview Effect 4.1 integration | October 29, 2026

## Candidate and consumer changes

The isolated `codex/preview-main-sync-20261029` candidate merges main's Effect
upgrade `af4b0bc7` into the reviewed preview sync at
`3722477a98a79cde057e2f2ef0342c91de6f9477`. It preserves the current Block,
Binding, Step, Machine, Query and UI authoring APIs.

- Workspace development dependencies and overrides pin Effect, platform and
  test packages to 4.1.0. Published Effect-family contracts use `~4.1.0`,
  accepting 4.1 patches and excluding 4.0 and 4.2. This run verifies 4.1.0;
  it does not prove compatibility with future patches.
- The Node adapter, Vite plugin and DevTools MCP server require Node 22.19.0
  or newer, matching their platform packages. The repository's stricter
  existing supported Node lines are unchanged.
- UUID consumers acquire `SecureRandom.SecureRandom` from `effect/crypto`
  and call `uuidV4()`. Node and browser roots provide the matching
  `layerSecureRandom`. The Vite relay uses the Service for both ids and
  tokens. UUID generation is infallible; example Command completion Messages
  replace the obsolete success/failure pairs.
- Asynchronous Map and chart Mount acquisition is interruptible. Handles
  are constructed after the interruptible wait. Existing lifecycle checks
  cover unmounting during setup and retained cleanup behavior.

The preview's TypeScript 7.1 beta pins, package graph and security overrides
are preserved. Main's Effect reference subtree is adopted unchanged.
Historical releases, migration baselines and benchmark receipts retain their
original versions. The active upgrade guide describes the new cohort.

The [#1733 feedback](https://github.com/foldkit/foldkit/issues/1733#issuecomment-6500513592)
identifies the removed Crypto export and the SecureRandom migration. The
contributor closed #1851's Node-crypto workaround in favor of this coordinated
upgrade. No workaround from that PR was copied into the candidate.

## npm workspace and packed verification

The existing packed SSR consumer now contains two npm workspaces. A library
exports a Model Schema; an application imports it and authors a Block update
through the public package. Both that consumer and the existing packed
declaration consumers typecheck, and the shared-Model update executes.

Installation uses strict peer resolution with no Effect override or legacy
peer flag. The lockfile contains one physical Effect 4.1.0 installation.
Twelve package and workspace resolution checks point to that installation.
The installed Vite relay starts with SecureRandom and answers a request.
Adding a second physical copy of the same Effect version only under the
application workspace makes the runtime probe reject the graph. Removing that
copy restores the passing result without changing the root lockfile.

Both SSR deployments build and satisfy the singleton-package checks. Chromium
runs the full hydration, ownership and CSP suite; Firefox and WebKit run the
existing critical matrix. All pass with the 4.1 package pair.

The new fixture initially called a raw Struct as a constructor. External
TypeScript rejected that call. It now uses `Model.make`; this was a fixture
error, not a framework defect. The original failing log is retained.

## Verification

| Check                                                                    | Result                                   |
| ------------------------------------------------------------------------ | ---------------------------------------- |
| Public package builds                                                    | All 9 pass                               |
| Workspace package typechecks                                             | All 53 pass                              |
| Core and UI source/emitted declaration gates                             | Pass                                     |
| Unchanged compiler-performance ceilings                                  | All 7 pass                               |
| Full core runtime suite                                                  | 3,923 pass; one opt-in benchmark skipped |
| Full UI runtime suite                                                    | 1,336 pass                               |
| DevTools MCP                                                             | 98 pass; four skipped                    |
| Vite plugin                                                              | 380 pass; three skipped                  |
| Affected apps and Website documentation                                  | 1,087 pass                               |
| Updated impure-call lint rule                                            | 31 pass                                  |
| Repository application and Effect lint                                   | Pass                                     |
| Script typecheck                                                         | Pass                                     |
| Script tests                                                             | 233 pass                                 |
| Dead-code check and Website production build                             | Pass                                     |
| Packed types, workspace execution, relay and three-browser SSR/hydration | Pass                                     |

The focused lifecycle suite's 224 passing cases overlap the full core suite;
they are not added to the unique test total. Compiler instantiation counts
remain within the established ceilings. They do not measure editor latency
or rendering time.

Logs and the verification receipt are under
`/private/tmp/foldkit-preview-feedback-20261029-1421`, prefixed `effect41-`.
The dependency audit covers all 56 manifests and 54 lockfile importers.

## Release status

The source integration does not publish packages or promote PR #1655's Ready
snapshot. Independent exact-commit review and remote CI precede release
approval. Publication remains held for the user.
